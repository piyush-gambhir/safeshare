import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import sodium from "libsodium-wrappers";
import { redis } from "../../server.js";
import {
  generateSessionId,
  createTorrentInfoHash,
} from "../../utils/identity.js";
import { generateInfoHash, createMagnetUri } from "../../utils/p2p.js";
import { PeerSession } from "../../utils/types.js";
import { FILE_EXPIRY_SECONDS, FRONTEND_URL } from "../../utils/constants.js";
import {
  InitiateShareInput,
  UpdateTorrentInput,
  UpdateStatusInput,
  InitiateShareResponse,
  UpdateTorrentResponse,
  SessionInfoResponse,
  UpdateStatusResponse,
  ErrorResponse,
} from "./fileShare.schema.js";

export async function initiateShareHandler(
  request: FastifyRequest<{
    Body: InitiateShareInput;
  }>,
  reply: FastifyReply,
): Promise<InitiateShareResponse> {
  await sodium.ready;

  const { fileMetadata } = request.body;

  // Generate a unique session ID based on browser fingerprint and timestamp
  const browserInfo = request.headers["user-agent"] || "";
  const ipHash = crypto
    .createHash("sha256")
    .update(request.ip || "")
    .digest("hex")
    .slice(0, 8);
  const sessionId = generateSessionId(browserInfo, ipHash);

  // Generate encryption keys for this session using sodium
  const keyPair = sodium.crypto_box_keypair();
  const publicKeyHex = Buffer.from(keyPair.publicKey).toString("hex");
  const privateKeyHex = Buffer.from(keyPair.privateKey).toString("hex");

  // Generate a torrent info hash
  const torrentInfoHash = generateInfoHash({
    name: fileMetadata.name,
    size: fileMetadata.size,
    sessionId,
  });

  // Create magnet URI
  const magnetUri = createMagnetUri(
    torrentInfoHash,
    fileMetadata.name,
    fileMetadata.size,
  );

  // Store session information with TTL
  const sessionInfo: PeerSession = {
    sessionId,
    publicKey: publicKeyHex,
    privateKey: privateKeyHex,
    torrentInfoHash,
    magnetUri,
    fileMetadata,
    status: "initiated",
    createdAt: Date.now(),
    expiresAt: Date.now() + FILE_EXPIRY_SECONDS * 1000,
  };

  await redis.set(
    `session:${sessionId}`,
    JSON.stringify(sessionInfo),
    "EX",
    FILE_EXPIRY_SECONDS,
  );

  // Return only what the client needs to know
  return {
    sessionId,
    publicKey: publicKeyHex,
    torrentInfoHash,
    shareableLink: `${FRONTEND_URL}/receive/${sessionId}`,
    expiresAt: sessionInfo.expiresAt,
  };
}

export async function updateTorrentHandler(
  request: FastifyRequest<{
    Body: UpdateTorrentInput;
  }>,
  reply: FastifyReply,
): Promise<UpdateTorrentResponse | ErrorResponse> {
  const { sessionId, torrentInfoHash, magnetUri } = request.body;

  // Retrieve the session
  const sessionData = await redis.get(`session:${sessionId}`);
  if (!sessionData) {
    return reply.code(404).send({
      error: "Session not found",
    });
  }

  const session: PeerSession = JSON.parse(sessionData);
  session.torrentInfoHash = torrentInfoHash;
  session.magnetUri = magnetUri;
  session.status = "ready";

  // Update in Redis
  await redis.set(
    `session:${sessionId}`,
    JSON.stringify(session),
    "EX",
    FILE_EXPIRY_SECONDS,
  );

  return { success: true };
}

export async function getSessionInfoHandler(
  request: FastifyRequest<{
    Params: { sessionId: string };
  }>,
  reply: FastifyReply,
): Promise<SessionInfoResponse | ErrorResponse> {
  const { sessionId } = request.params;

  // Retrieve the session
  const sessionData = await redis.get(`session:${sessionId}`);
  if (!sessionData) {
    return reply.code(404).send({
      error: "Session not found or expired",
    });
  }

  const session: PeerSession = JSON.parse(sessionData);

  // Return only what the receiver needs
  return {
    sessionId: session.sessionId,
    publicKey: session.publicKey,
    torrentInfoHash: session.torrentInfoHash,
    magnetUri: session.magnetUri,
    fileMetadata: session.fileMetadata,
    status: session.status,
    expiresAt: session.expiresAt,
  };
}

export async function handleWebSocketConnection(
  connection: {
    socket: {
      send: (data: string) => void;
      on: (event: string, callback: () => void) => void;
    };
  },
  request: FastifyRequest<{
    Params: { sessionId: string };
  }>,
): Promise<void> {
  const { sessionId } = request.params;

  // Set up subscription for status updates
  const statusUpdateInterval = setInterval(async () => {
    const sessionData = await redis.get(`session:${sessionId}`);
    if (!sessionData) {
      connection.socket.send(JSON.stringify({ status: "expired" }));
      clearInterval(statusUpdateInterval);
      return;
    }

    const session: PeerSession = JSON.parse(sessionData);
    connection.socket.send(
      JSON.stringify({
        status: session.status,
        peers: session.peers || 0,
        progress: session.progress || 0,
      }),
    );
  }, 2000);

  // Clean up on socket close
  connection.socket.on("close", () => {
    clearInterval(statusUpdateInterval);
  });
}

export async function updateStatusHandler(
  request: FastifyRequest<{
    Body: UpdateStatusInput;
  }>,
  reply: FastifyReply,
): Promise<UpdateStatusResponse | ErrorResponse> {
  const { sessionId, status, peers, progress } = request.body;

  const sessionData = await redis.get(`session:${sessionId}`);
  if (!sessionData) {
    return reply.code(404).send({
      error: "Session not found",
    });
  }

  const session: PeerSession = JSON.parse(sessionData);
  session.status = status;
  if (peers !== undefined) session.peers = peers;
  if (progress !== undefined) session.progress = progress;

  await redis.set(
    `session:${sessionId}`,
    JSON.stringify(session),
    "EX",
    FILE_EXPIRY_SECONDS,
  );

  return { success: true };
}
