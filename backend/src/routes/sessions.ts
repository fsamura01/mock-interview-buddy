import type { FastifyInstance } from "fastify";
import { requireAuth, requireRole, sanitizeUser } from "../auth/jwt.js";
import {
  CreateSessionSchema,
  JoinSessionSchema,
  UpdateSessionStatusSchema,
} from "../schemas/index.js";
import type { IStore } from "../store/interface.js";
import type { AuthTokenPayload, Participant, User } from "../models/domain.js";

const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export function sessionRoutes(store: IStore) {
  return async (app: FastifyInstance) => {
    // POST /api/v1/sessions/join (Public - candidate joins via invite token)
    app.post("/api/v1/sessions/join", async (request, reply) => {
      const parsed = JoinSessionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: parsed.error.issues[0]?.message || "Invalid join payload",
            details: parsed.error.format(),
          },
        });
      }

      const { token, displayName } = parsed.data;
      const session = await store.getSessionByInviteToken(token);
      if (!session) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Invalid invitation token or session does not exist",
          },
        });
      }

      // Check if session has ended
      if (session.status === "ended") {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "This interview session has already ended",
          },
        });
      }

      // Create a candidate user entry
      const candidateUser: User = {
        id: genId("u_cand"),
        displayName,
        email: `${displayName.toLowerCase().replace(/\s+/g, ".")}@candidate.dev`,
        role: "candidate",
        color: "#2dd4bf",
      };
      await store.createUser(candidateUser);

      // Create participant entry
      const participant: Participant = {
        id: genId("par"),
        sessionId: session.id,
        userId: candidateUser.id,
        displayName: candidateUser.displayName,
        role: "candidate",
        color: candidateUser.color,
        online: true,
        cursor: null,
      };
      await store.addOrUpdateParticipant(participant);

      // Log audit
      await store.createAudit(session.id, displayName, "session.joined", `${displayName} joined as candidate`);

      // Generate JWT
      const tokenPayload: AuthTokenPayload = {
        userId: candidateUser.id,
        email: candidateUser.email,
        role: candidateUser.role,
        displayName: candidateUser.displayName,
        sessionId: session.id,
      };
      const accessToken = app.jwt.sign(tokenPayload, { expiresIn: "24h" });

      return reply.send({
        data: {
          user: sanitizeUser(candidateUser),
          session,
          participant,
          accessToken,
        },
      });
    });

    // GET /api/v1/sessions (List sessions for current user)
    app.get(
      "/api/v1/sessions",
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const query = request.query as { limit?: string; cursor?: string; status?: string };
        const limit = query.limit ? parseInt(query.limit, 10) : 20;

        let sessions = await store.listSessions(request.user.userId);

        if (query.status) {
          sessions = sessions.filter((s) => s.status === query.status);
        }

        return reply.send({
          data: sessions.slice(0, limit),
          pagination: {
            nextCursor: null,
            hasMore: sessions.length > limit,
          },
        });
      },
    );

    // POST /api/v1/sessions (Create session - Interviewer / Admin)
    app.post(
      "/api/v1/sessions",
      { preHandler: [requireRole(["interviewer", "admin"])] },
      async (request, reply) => {
        const parsed = CreateSessionSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: {
              code: "BAD_REQUEST",
              message: parsed.error.issues[0]?.message || "Invalid session payload",
              details: parsed.error.format(),
            },
          });
        }

        const session = await store.createSession(request.user.userId, parsed.data);
        return reply.status(201).send({
          data: session,
        });
      },
    );

    // GET /api/v1/sessions/:sessionId (Get session metadata)
    app.get(
      "/api/v1/sessions/:sessionId",
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

        return reply.send({
          data: session,
        });
      },
    );

    // PATCH /api/v1/sessions/:sessionId/status (Update session status)
    app.patch(
      "/api/v1/sessions/:sessionId/status",
      { preHandler: [requireRole(["interviewer", "admin"])] },
      async (request, reply) => {
        const { sessionId } = request.params as { sessionId: string };
        const parsed = UpdateSessionStatusSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: {
              code: "BAD_REQUEST",
              message: parsed.error.issues[0]?.message || "Invalid status payload",
              details: parsed.error.format(),
            },
          });
        }

        const session = await store.getSessionById(sessionId);
        if (!session) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: `Session '${sessionId}' not found`,
            },
          });
        }

        const updated = await store.updateSessionStatus(sessionId, parsed.data.status);
        await store.createAudit(
          sessionId,
          request.user.displayName,
          `session.${parsed.data.status}`,
          `Session status set to ${parsed.data.status}`,
        );

        return reply.send({
          data: updated,
        });
      },
    );

    // GET /api/v1/sessions/:sessionId/board (Aggregated session board)
    app.get(
      "/api/v1/sessions/:sessionId/board",
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const { sessionId } = request.params as { sessionId: string };
        const board = await store.getBoard(sessionId);
        if (!board) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: `Session '${sessionId}' not found`,
            },
          });
        }

        return reply.send({
          data: board,
        });
      },
    );
  };
}
