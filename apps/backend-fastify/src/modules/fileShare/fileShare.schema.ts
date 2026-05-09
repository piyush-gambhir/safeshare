import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

// Input schemas
const fileMetadataSchema = z.object({
  name: z.string(),
  size: z.number(),
  type: z.string(),
});

const initiateShareInputSchema = z.object({
  fileMetadata: fileMetadataSchema,
});

const updateTorrentInputSchema = z.object({
  sessionId: z.string(),
  torrentInfoHash: z.string(),
  magnetUri: z.string(),
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
  publicKey: z.string(),
  torrentInfoHash: z.string(),
  shareableLink: z.string(),
  expiresAt: z.number(),
});

const updateTorrentResponseSchema = z.object({
  success: z.boolean(),
});

const sessionInfoResponseSchema = z.object({
  sessionId: z.string(),
  publicKey: z.string(),
  torrentInfoHash: z.string(),
  magnetUri: z.string().optional(),
  fileMetadata: fileMetadataSchema,
  status: z.string(),
  expiresAt: z.number(),
});

const updateStatusResponseSchema = z.object({
  success: z.boolean(),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

// Export schemas and types
export type InitiateShareInput = z.infer<typeof initiateShareInputSchema>;
export type UpdateTorrentInput = z.infer<typeof updateTorrentInputSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusInputSchema>;

export type InitiateShareResponse = z.infer<typeof initiateShareResponseSchema>;
export type UpdateTorrentResponse = z.infer<typeof updateTorrentResponseSchema>;
export type SessionInfoResponse = z.infer<typeof sessionInfoResponseSchema>;
export type UpdateStatusResponse = z.infer<typeof updateStatusResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const { schemas: fileShareSchemas, $ref } = buildJsonSchemas(
  {
    initiateShareInputSchema,
    initiateShareResponseSchema,
    updateTorrentInputSchema,
    updateTorrentResponseSchema,
    sessionInfoResponseSchema,
    updateStatusInputSchema,
    updateStatusResponseSchema,
    errorResponseSchema,
  },
  { $id: "fileShareSchemas" },
);
