import { FastifyInstance } from "fastify";
import {
  initiateShareHandler,
  signalHandler,
  updateTorrentHandler,
  getSessionInfoHandler,
  updateStatusHandler,
  handleWebSocketConnection,
} from "./fileShare.controller.js";
import { $ref, SESSION_ID_PATTERN } from "./fileShare.schema.js";

export async function fileShareRoutes(server: FastifyInstance) {

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


  server.get(
    "/session/:sessionId",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            sessionId: { type: "string", pattern: SESSION_ID_PATTERN },
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


  server.get(
    "/status/:sessionId",
    {
      websocket: true,
    },
    handleWebSocketConnection,
  );


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
