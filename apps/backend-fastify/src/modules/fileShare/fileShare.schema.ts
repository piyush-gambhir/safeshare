import { z } from "zod";

// Generous upper bound for a non-trickled SDP blob with all ICE candidates.
const MAX_SDP_LENGTH = 64 * 1024;

// Input schemas
// No file metadata: the web client sends file name, size and type only inside
// the end-to-end encrypted data channel.
const initiateShareInputSchema = z.object({});

const updateTorrentInputSchema = z.object({
  sessionId: z.string(),
  torrentInfoHash: z.string(),
  magnetUri: z.string(),
});

const signalInputSchema = z.object({
  sessionId: z.string(),
  type: z.enum(["offer", "answer"]),
  sdp: z.string().min(1).max(MAX_SDP_LENGTH),
});

const updateStatusInputSchema = z.object({
  sessionId: z.string(),
  status: z.enum(["initiated", "ready", "connected", "completed", "error"]),
  peers: z.number().optional(),
  progress: z.number().optional(),
});

// Response schemas
const initiateShareResponseSchema = z.object({
  sessionId: z.string(),
  shareableLink: z.string(),
  expiresAt: z.number(),
});

const successResponseSchema = z.object({
  success: z.boolean(),
});

const sessionInfoResponseSchema = z.object({
  sessionId: z.string(),
  status: z.string(),
  offer: z.string().optional(),
  answer: z.string().optional(),
  torrentInfoHash: z.string().optional(),
  magnetUri: z.string().optional(),
  expiresAt: z.number(),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

// Export schemas and types
export type InitiateShareInput = z.infer<typeof initiateShareInputSchema>;
export type UpdateTorrentInput = z.infer<typeof updateTorrentInputSchema>;
export type SignalInput = z.infer<typeof signalInputSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusInputSchema>;

export type InitiateShareResponse = z.infer<typeof initiateShareResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type SessionInfoResponse = z.infer<typeof sessionInfoResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

const models = {
  initiateShareInputSchema,
  initiateShareResponseSchema,
  updateTorrentInputSchema,
  signalInputSchema,
  successResponseSchema,
  sessionInfoResponseSchema,
  updateStatusInputSchema,
  errorResponseSchema,
};

export const fileShareSchemas = [
  {
    ...z.toJSONSchema(z.object(models), { target: "draft-7" }),
    $id: "fileShareSchemas",
  },
];

export const $ref = (key: keyof typeof models) => ({
  $ref: `fileShareSchemas#/properties/${key}`,
});
