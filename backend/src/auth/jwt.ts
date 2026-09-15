import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthTokenPayload, User } from "../models/domain.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

/**
 * Remove sensitive credentials from user objects before serialization
 */
export function sanitizeUser(user: User): Omit<User, "passwordHash"> {
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

/**
 * Pre-handler hook to authenticate JWT Bearer tokens
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid, missing, or expired authorization token",
      },
    });
  }
}

/**
 * Pre-handler hook to require specific roles
 */
export function requireRole(allowedRoles: Array<User["role"]>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: {
          code: "FORBIDDEN",
          message: `Insufficient permissions. Allowed roles: ${allowedRoles.join(", ")}`,
        },
      });
    }
  };
}
