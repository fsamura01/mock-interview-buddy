import type { FastifyInstance } from "fastify";
import { comparePassword } from "../auth/password.js";
import { requireAuth, sanitizeUser } from "../auth/jwt.js";
import { LoginSchema } from "../schemas/index.js";
import type { IStore } from "../store/interface.js";
import type { AuthTokenPayload } from "../models/domain.js";

export function authRoutes(store: IStore) {
  return async (app: FastifyInstance) => {
    // POST /api/v1/auth/login
    app.post("/api/v1/auth/login", async (request, reply) => {
      const parsed = LoginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: parsed.error.issues[0]?.message || "Invalid login payload",
            details: parsed.error.format(),
          },
        });
      }

      const { email, password } = parsed.data;
      const user = await store.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          },
        });
      }

      const passwordValid = await comparePassword(password, user.passwordHash);
      if (!passwordValid) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          },
        });
      }

      const tokenPayload: AuthTokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      };

      const accessToken = app.jwt.sign(tokenPayload, { expiresIn: "7d" });

      return reply.send({
        data: {
          user: sanitizeUser(user),
          accessToken,
        },
      });
    });

    // GET /api/v1/auth/me
    app.get(
      "/api/v1/auth/me",
      { preHandler: [requireAuth] },
      async (request, reply) => {
        const user = await store.getUserById(request.user.userId);
        if (!user) {
          return reply.status(404).send({
            error: {
              code: "NOT_FOUND",
              message: "User account not found",
            },
          });
        }

        return reply.send({
          data: sanitizeUser(user),
        });
      },
    );
  };
}
