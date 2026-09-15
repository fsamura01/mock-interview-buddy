import type { FastifyInstance } from "fastify";
import { requireAuth, requireRole } from "../auth/jwt.js";
import { SaveSnapshotSchema } from "../schemas/index.js";
import type { IStore } from "../store/interface.js";

export function snapshotRoutes(store: IStore) {
  return async (app: FastifyInstance) => {
    // GET /api/v1/sessions/:sessionId/snapshots (List snapshots)
    app.get(
      "/api/v1/sessions/:sessionId/snapshots",
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

        const snapshots = await store.listSnapshots(sessionId);
        return reply.send({
          data: snapshots,
        });
      },
    );

    // POST /api/v1/sessions/:sessionId/snapshots (Save snapshot)
    app.post(
      "/api/v1/sessions/:sessionId/snapshots",
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

        const parsed = SaveSnapshotSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: {
              code: "BAD_REQUEST",
              message: parsed.error.issues[0]?.message || "Invalid snapshot payload",
              details: parsed.error.format(),
            },
          });
        }

        const snapshot = await store.createSnapshot(sessionId, parsed.data.label);
        await store.createAudit(
          sessionId,
          request.user.displayName,
          "snapshot.saved",
          snapshot.label,
        );

        return reply.status(201).send({
          data: snapshot,
        });
      },
    );

    // POST /api/v1/sessions/:sessionId/snapshots/:snapshotId/restore (Restore snapshot)
    app.post(
      "/api/v1/sessions/:sessionId/snapshots/:snapshotId/restore",
      { preHandler: [requireRole(["interviewer", "admin"])] },
      async (request, reply) => {
        const { sessionId, snapshotId } = request.params as {
          sessionId: string;
          snapshotId: string;
        };

        const session = await store.getSessionById(sessionId);
        if (!session) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: `Session '${sessionId}' not found`,
            },
          });
        }

        const snapshot = await store.getSnapshot(sessionId, snapshotId);
        if (!snapshot) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: `Snapshot '${snapshotId}' not found in session '${sessionId}'`,
            },
          });
        }

        const restoredBoard = await store.restoreSnapshot(sessionId, snapshotId);
        await store.createAudit(
          sessionId,
          request.user.displayName,
          "snapshot.restored",
          snapshot.label,
        );

        return reply.send({
          data: restoredBoard,
        });
      },
    );
  };
}
