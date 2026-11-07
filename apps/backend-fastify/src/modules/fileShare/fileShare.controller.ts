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
// A separate namespace, so no session ID can address a signal key.
const signalKey = (sessionId: string, type: "offer" | "answer") =>
  `signal:${sessionId}:${type}`;

async function loadSession(sessionId: string): Promise<PeerSession | null> {
  const data = await redis.get(sessionKey(sessionId));
  return data ? (JSON.parse(data) as PeerSession) : null;
}

// Updates keep the original TTL, so the advertised expiresAt stays accurate,
// and never recreate a session that expired in the meantime (XX).
async function updateSession(session: PeerSession): Promise<boolean> {
  const result = await redis.set(
    sessionKey(session.sessionId),
    JSON.stringify(session),
    "KEEPTTL",
    "XX",
  );
  return result === "OK";
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

  if (type === "answer" && !(await redis.exists(signalKey(sessionId, "offer")))) {
    return reply.code(409).send({ error: "Session has no offer yet" });
  }

  // SET NX claims the slot atomically: one offer and one answer per session,
  // and the first receiver to answer wins. The slot expires with the session.
  const claimed = await redis.set(
    signalKey(sessionId, type),
    sdp,
    "PXAT",
    session.expiresAt,
    "NX",
  );
  if (claimed !== "OK") {
    return reply.code(409).send({ error: `Session already has an ${type}` });
  }

  session.status = type === "offer" ? "waiting" : "answered";
  // The session (and the just-claimed slot) expired while handling the request.
  if (!(await updateSession(session))) {
    return reply.code(404).send({ error: "Session not found" });
  }

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
  if (!(await updateSession(session))) {
    return reply.code(404).send({ error: "Session not found" });
  }

  return { success: true };
}

export async function getSessionInfoHandler(
  request: FastifyRequest<{
    Params: { sessionId: string };
  }>,
  reply: FastifyReply,
): Promise<SessionInfoResponse | ErrorResponse> {
  const { sessionId } = request.params;
  const [data, offer, answer] = await redis.mget(
    sessionKey(sessionId),
    signalKey(sessionId, "offer"),
    signalKey(sessionId, "answer"),
  );
  if (!data) {
    return reply.code(404).send({ error: "Session not found or expired" });
  }
  const session = JSON.parse(data) as PeerSession;

  return {
    sessionId: session.sessionId,
    status: session.status,
    offer: offer ?? undefined,
    answer: answer ?? undefined,
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
  if (!(await updateSession(session))) {
    return reply.code(404).send({ error: "Session not found" });
  }

  return { success: true };
}
