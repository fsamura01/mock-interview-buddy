import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/jwt.js";
import { SendMessageSchema } from "../schemas/index.js";
import type { IStore } from "../store/interface.js";

export function chatRoutes(store: IStore) {
  return async (app: FastifyInstance) => {
    // GET /api/v1/sessions/:sessionId/messages (List chat messages)
    app.get(
      "/api/v1/sessions/:sessionId/messages",
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const { sessionId } = request.params as { sessionId: string };
        const session = await store.getSessionById(sessionId);
        if (!session) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: `Session '${sessionId}' not found`,
            },
          });
        }

        const messages = await store.listMessages(sessionId);
        return reply.send({
          data: messages,
        });
      },
    );

    // POST /api/v1/sessions/:sessionId/messages (Send chat message)
    app.post(
      "/api/v1/sessions/:sessionId/messages",
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const { sessionId } = request.params as { sessionId: string };
        const session = await store.getSessionById(sessionId);
        if (!session) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: `Session '${sessionId}' not found`,
            },
          });
        }

        const parsed = SendMessageSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: {
              code: "BAD_REQUEST",
              message: parsed.error.issues[0]?.message || "Invalid message payload",
              details: parsed.error.format(),
            },
          });
        }

        const message = await store.createMessage(
          sessionId,
          request.user.userId,
          request.user.displayName,
          parsed.data.body,
        );

        return reply.status(201).send({
          data: message,
        });
      },
    );
  };
}
