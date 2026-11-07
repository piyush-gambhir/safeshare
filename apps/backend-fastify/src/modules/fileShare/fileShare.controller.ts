import { FastifyRequest, FastifyReply } from "fastify";
import crypto from "node:crypto";
import { redis } from "../../server.js";
import { PeerSession } from "../../utils/types.js";
import { FILE_EXPIRY_SECONDS, FRONTEND_URL } from "../../utils/constants.js";
import {
  UpdateTorrentInput,
  SignalInput,
  UpdateStatusInput,
  InitiateShareResponse,
  SuccessResponse,
  SessionInfoResponse,
  ErrorResponse,
} from "./fileShare.schema.js";

const sessionKey = (sessionId: string) => `session:${sessionId}`;

async function loadSession(sessionId: string): Promise<PeerSession | null> {
  const data = await redis.get(sessionKey(sessionId));
  return data ? (JSON.parse(data) as PeerSession) : null;
}

// Updates keep the original TTL so the advertised expiresAt stays accurate.
async function updateSession(session: PeerSession): Promise<void> {
  await redis.set(
    sessionKey(session.sessionId),
    JSON.stringify(session),
    "KEEPTTL",
  );
}

export async function initiateShareHandler(): Promise<InitiateShareResponse> {
  // 128 bits from the OS CSPRNG. Knowing a session ID is not enough to read a
  // web transfer: the decryption key travels only in the link's URL fragment.
  const sessionId = crypto.randomBytes(16).toString("hex");
  const now = Date.now();
  const session: PeerSession = {
    sessionId,
    status: "initiated",
    createdAt: now,
    expiresAt: now + FILE_EXPIRY_SECONDS * 1000,
  };

  await redis.set(
    sessionKey(sessionId),
    JSON.stringify(session),
    "EX",
    FILE_EXPIRY_SECONDS,
  );

  return {
    sessionId,
    shareableLink: `${FRONTEND_URL}/receive/${sessionId}`,
    expiresAt: session.expiresAt,
  };
}

export async function signalHandler(
  request: FastifyRequest<{
    Body: SignalInput;
  }>,
  reply: FastifyReply,
): Promise<SuccessResponse | ErrorResponse> {
  const { sessionId, type, sdp } = request.body;

  const session = await loadSession(sessionId);
  if (!session) {
    return reply.code(404).send({ error: "Session not found" });
  }

  // One offer and one answer per session: the first receiver to answer wins.
  if (session[type]) {
    return reply.code(409).send({ error: `Session already has an ${type}` });
  }
  if (type === "answer" && !session.offer) {
    return reply.code(409).send({ error: "Session has no offer yet" });
  }

  session[type] = sdp;
  session.status = type === "offer" ? "waiting" : "answered";
  await updateSession(session);

  return { success: true };
}

export async function updateTorrentHandler(
  request: FastifyRequest<{
    Body: UpdateTorrentInput;
  }>,
  reply: FastifyReply,
): Promise<SuccessResponse | ErrorResponse> {
  const { sessionId, torrentInfoHash, magnetUri } = request.body;

  const session = await loadSession(sessionId);
  if (!session) {
    return reply.code(404).send({ error: "Session not found" });
  }

  session.torrentInfoHash = torrentInfoHash;
  session.magnetUri = magnetUri;
  session.status = "ready";
  await updateSession(session);

  return { success: true };
}

export async function getSessionInfoHandler(
  request: FastifyRequest<{
    Params: { sessionId: string };
  }>,
  reply: FastifyReply,
): Promise<SessionInfoResponse | ErrorResponse> {
  const session = await loadSession(request.params.sessionId);
  if (!session) {
    return reply.code(404).send({ error: "Session not found or expired" });
  }

  return {
    sessionId: session.sessionId,
    status: session.status,
    offer: session.offer,
    answer: session.answer,
    torrentInfoHash: session.torrentInfoHash,
    magnetUri: session.magnetUri,
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
    const session = await loadSession(sessionId);
    if (!session) {
      connection.socket.send(JSON.stringify({ status: "expired" }));
      clearInterval(statusUpdateInterval);
      return;
    }

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
): Promise<SuccessResponse | ErrorResponse> {
  const { sessionId, status, peers, progress } = request.body;

  const session = await loadSession(sessionId);
  if (!session) {
    return reply.code(404).send({ error: "Session not found" });
  }

  session.status = status;
  if (peers !== undefined) session.peers = peers;
  if (progress !== undefined) session.progress = progress;
  await updateSession(session);

  return { success: true };
}
