import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/jwt.js";
import {
  CreateEdgeSchema,
  CreateNodeSchema,
  UpdateNodeSchema,
} from "../schemas/index.js";
import type { IStore } from "../store/interface.js";

export function canvasRoutes(store: IStore) {
  return async (app: FastifyInstance) => {
    // -------------------------------------------------------------------------
    // NODES
    // -------------------------------------------------------------------------

    // POST /api/v1/sessions/:sessionId/nodes (Create node)
    app.post(
      "/api/v1/sessions/:sessionId/nodes",
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

        const parsed = CreateNodeSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: {
              code: "BAD_REQUEST",
              message: parsed.error.issues[0]?.message || "Invalid node payload",
              details: parsed.error.format(),
            },
          });
        }

        const created = await store.createNode(sessionId, parsed.data);
        await store.createAudit(
          sessionId,
          request.user.displayName,
          "node.created",
          `${created.kind} · ${created.label}`,
        );

        return reply.status(201).send({
          data: created,
        });
      },
    );

    // PATCH /api/v1/sessions/:sessionId/nodes/:nodeId (Update node)
    app.patch(
      "/api/v1/sessions/:sessionId/nodes/:nodeId",
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const { sessionId, nodeId } = request.params as {
          sessionId: string;
          nodeId: string;
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

        const parsed = UpdateNodeSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: {
              code: "BAD_REQUEST",
              message: parsed.error.issues[0]?.message || "Invalid update payload",
              details: parsed.error.format(),
            },
          });
        }

        const updated = await store.updateNode(sessionId, nodeId, parsed.data);
        if (!updated) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: `Node '${nodeId}' not found in session '${sessionId}'`,
            },
          });
        }

        if (parsed.data.label || parsed.data.notes) {
          await store.createAudit(
            sessionId,
            request.user.displayName,
            "node.updated",
            updated.label,
          );
        }

        return reply.send({
          data: updated,
        });
      },
    );

    // DELETE /api/v1/sessions/:sessionId/nodes/:nodeId (Delete node)
    app.delete(
      "/api/v1/sessions/:sessionId/nodes/:nodeId",
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const { sessionId, nodeId } = request.params as {
          sessionId: string;
          nodeId: string;
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

        const existing = await store.getNode(sessionId, nodeId);
        if (!existing) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: `Node '${nodeId}' not found in session '${sessionId}'`,
            },
          });
        }

        await store.deleteNode(sessionId, nodeId);
        await store.createAudit(
          sessionId,
          request.user.displayName,
          "node.deleted",
          existing.label,
        );

        return reply.status(204).send();
      },
    );

    // -------------------------------------------------------------------------
    // EDGES
    // -------------------------------------------------------------------------

    // POST /api/v1/sessions/:sessionId/edges (Create edge)
    app.post(
      "/api/v1/sessions/:sessionId/edges",
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

        const parsed = CreateEdgeSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: {
              code: "BAD_REQUEST",
              message: parsed.error.issues[0]?.message || "Invalid edge payload",
              details: parsed.error.format(),
            },
          });
        }

        // Validate source and target nodes exist in this session
        const fromNode = await store.getNode(sessionId, parsed.data.fromNodeId);
        const toNode = await store.getNode(sessionId, parsed.data.toNodeId);
        if (!fromNode || !toNode) {
          return reply.status(400).send({
            error: {
              code: "BAD_REQUEST",
              message: "Source or destination node does not exist in this session",
            },
          });
        }

        const created = await store.createEdge(sessionId, parsed.data);
        await store.createAudit(
          sessionId,
          request.user.displayName,
          "edge.created",
          created.label || created.protocol,
        );

        return reply.status(201).send({
          data: created,
        });
      },
    );

    // DELETE /api/v1/sessions/:sessionId/edges/:edgeId (Delete edge)
    app.delete(
      "/api/v1/sessions/:sessionId/edges/:edgeId",
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const { sessionId, edgeId } = request.params as {
          sessionId: string;
          edgeId: string;
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

        const deleted = await store.deleteEdge(sessionId, edgeId);
        if (!deleted) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: `Edge '${edgeId}' not found in session '${sessionId}'`,
            },
          });
        }

        await store.createAudit(
          sessionId,
          request.user.displayName,
          "edge.deleted",
          edgeId,
        );

        return reply.status(204).send();
      },
    );
  };
}
