import { FastifyInstance } from "fastify";
import {
  initiateShareHandler,
  signalHandler,
  updateTorrentHandler,
  getSessionInfoHandler,
  updateStatusHandler,
  handleWebSocketConnection,
} from "./fileShare.controller.js";
import { $ref } from "./fileShare.schema.js";

export async function fileShareRoutes(server: FastifyInstance) {
  // Route to initiate file sharing
  server.post(
    "/initiate",
    {
      schema: {
        body: $ref("initiateShareInputSchema"),
        response: {
          200: $ref("initiateShareResponseSchema"),
          500: $ref("errorResponseSchema"),
        },
        tags: ["File Sharing"],
        description: "Initiate a new file sharing session",
      },
    },
    initiateShareHandler,
  );

  // Route for the web client to store its WebRTC offer or answer (SDP)
  server.post(
    "/signal",
    {
      schema: {
        body: $ref("signalInputSchema"),
        response: {
          200: $ref("successResponseSchema"),
          404: $ref("errorResponseSchema"),
          409: $ref("errorResponseSchema"),
        },
        tags: ["File Sharing"],
        description: "Store the WebRTC offer or answer for a session",
      },
    },
    signalHandler,
  );

  // Route for the desktop client to store its WebTorrent magnet URI
  server.post(
    "/update-torrent",
    {
      schema: {
        body: $ref("updateTorrentInputSchema"),
        response: {
          200: $ref("successResponseSchema"),
          404: $ref("errorResponseSchema"),
        },
        tags: ["File Sharing"],
        description: "Update torrent information for a session",
      },
    },
    updateTorrentHandler,
  );

  // Route to get session info for receiver
  server.get(
    "/session/:sessionId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            sessionId: { type: "string" },
          },
          required: ["sessionId"],
        },
        response: {
          200: $ref("sessionInfoResponseSchema"),
          404: $ref("errorResponseSchema"),
        },
        tags: ["File Sharing"],
        description: "Get session information",
      },
    },
    getSessionInfoHandler,
  );

  // WebSocket endpoint for connection status updates
  server.get(
    "/status/:sessionId",
    {
      websocket: true,
    },
    handleWebSocketConnection,
  );

  // Route to update peer status
  server.post(
    "/update-status",
    {
      schema: {
        body: $ref("updateStatusInputSchema"),
        response: {
          200: $ref("successResponseSchema"),
          404: $ref("errorResponseSchema"),
        },
        tags: ["File Sharing"],
        description: "Update status information for a session",
      },
    },
    updateStatusHandler,
  );
}
