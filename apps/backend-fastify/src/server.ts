import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyWebsocket from "@fastify/websocket";
import cors from "@fastify/cors";
import { Redis } from "ioredis";
import { fileShareRoutes } from "./modules/fileShare/fileShare.route.js";
import { fileShareSchemas } from "./modules/fileShare/fileShare.schema.js";
import {
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  FRONTEND_URL,
} from "./utils/constants.js";


export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
});

export function buildServer() {
  const server = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
      },
    },
  });

  server.register(cors, {
    origin: FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });


  server.register(fastifySwagger, {
    openapi: {
      info: {
        title: "P2P Secure File Sharing API",
        description: "API for decentralized, end-to-end encrypted file sharing",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:8000",
          description: "Development server",
        },
      ],









    },
  });

  server.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });


  server.register(fastifyWebsocket);


  for (const schema of [...fileShareSchemas]) {
    server.addSchema(schema);
  }


  server.get("/v1/healthcheck", async () => ({ status: "ok" }));


  server.register(fileShareRoutes, { prefix: "v1/share" });


  server.ready().then(() => {
    console.log("Server is ready");
  });

  return server;
}
