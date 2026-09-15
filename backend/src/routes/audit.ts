import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/jwt.js";
import type { IStore } from "../store/interface.js";

export function auditRoutes(store: IStore) {
  return async (app: FastifyInstance) => {
    // GET /api/v1/sessions/:sessionId/audit (List audit logs)
    app.get(
      "/api/v1/sessions/:sessionId/audit",
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

        const audit = await store.listAudit(sessionId);
        return reply.send({
          data: audit,
        });
      },
    );
  };
}
