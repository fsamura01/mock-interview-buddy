import fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";

import type { IStore } from "./store/interface.js";
import { MemoryStore } from "./store/memory-store.js";
import { authRoutes } from "./routes/auth.js";
import { sessionRoutes } from "./routes/sessions.js";
import { canvasRoutes } from "./routes/canvas.js";
import { chatRoutes } from "./routes/chat.js";
import { auditRoutes } from "./routes/audit.js";
import { snapshotRoutes } from "./routes/snapshots.js";
import { realtimeRoutes } from "./routes/realtime.js";

export interface AppOptions {
  store?: IStore;
  jwtSecret?: string;
  logger?: boolean;
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({
    logger: options.logger ?? false,
  });

  // CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  // JWT
  await app.register(jwt, {
    secret: options.jwtSecret || process.env.JWT_SECRET || "mock-interview-buddy-dev-secret-key-32chars!",
  });

  // WebSocket
  await app.register(websocket);

  // Initialize or use provided Store
  const store = options.store || new MemoryStore();
  if (store instanceof MemoryStore) {
    await store.init();
  }

  // Consistent Global Error Handler conforming to openapi.yaml
  app.setErrorHandler((error, request, reply) => {
    // Fastify schema validation error
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: "BAD_REQUEST",
          message: error.message,
          details: error.validation,
        },
      });
    }

    // JWT verification error
    if (error.statusCode === 401) {
      return reply.status(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid, missing, or expired authorization token",
        },
      });
    }

    if (error.statusCode === 403) {
      return reply.status(403).send({
        error: {
          code: "FORBIDDEN",
          message: error.message || "Forbidden",
        },
      });
    }

    if (error.statusCode === 404) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: error.message || "Resource not found",
        },
      });
    }

    // Default internal error (no sensitive leak)
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      error: {
        code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "ERROR",
        message: statusCode === 500 ? "An unexpected error occurred" : error.message,
      },
    });
  });

  // Register API routes
  await app.register(authRoutes(store));
  await app.register(sessionRoutes(store));
  await app.register(canvasRoutes(store));
  await app.register(chatRoutes(store));
  await app.register(auditRoutes(store));
  await app.register(snapshotRoutes(store));
  await app.register(realtimeRoutes(store));

  // Health check / root
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
