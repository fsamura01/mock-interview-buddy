import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { IStore } from "../store/interface.js";
import type { AuthTokenPayload } from "../models/domain.js";

interface ConnectedClient {
  socket: WebSocket;
  user: AuthTokenPayload;
  sessionId: string;
}

export function realtimeRoutes(store: IStore) {
  const rooms = new Map<string, Set<ConnectedClient>>();

  function broadcast(sessionId: string, senderSocket: WebSocket, data: unknown) {
    const clients = rooms.get(sessionId);
    if (!clients) return;
    const payload = JSON.stringify(data);
    for (const client of clients) {
      if (client.socket !== senderSocket && client.socket.readyState === 1) {
        client.socket.send(payload);
      }
    }
  }

  return async (app: FastifyInstance) => {
    app.get(
      "/api/v1/sessions/:sessionId/ws",
      { websocket: true },
      async (socket: WebSocket, request) => {
        const { sessionId } = request.params as { sessionId: string };

        // Extract token from query or Authorization header
        const query = request.query as { token?: string };
        const authHeader = request.headers.authorization;
        const token = query.token || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

        let userPayload: AuthTokenPayload | null = null;
        if (token) {
          try {
            userPayload = app.jwt.verify<AuthTokenPayload>(token);
          } catch {
            // Invalid token
          }
        }

        if (!userPayload) {
          socket.send(
            JSON.stringify({
              error: {
                code: "UNAUTHORIZED",
                message: "Authentication token missing or invalid",
              },
            }),
          );
          socket.close(1008, "Unauthorized");
          return;
        }

        const session = await store.getSessionById(sessionId);
        if (!session) {
          socket.send(
            JSON.stringify({
              error: {
                code: "NOT_FOUND",
                message: `Session '${sessionId}' not found`,
              },
            }),
          );
          socket.close(1000, "Session not found");
          return;
        }

        const client: ConnectedClient = {
          socket,
          user: userPayload,
          sessionId,
        };

        if (!rooms.has(sessionId)) {
          rooms.set(sessionId, new Set());
        }
        rooms.get(sessionId)!.add(client);

        // Update participant online status
        await store.addOrUpdateParticipant({
          id: `p_${userPayload.userId}`,
          sessionId,
          userId: userPayload.userId,
          displayName: userPayload.displayName,
          role: userPayload.role,
          color: "#2dd4bf",
          online: true,
          cursor: null,
        });

        // Notify others that participant joined
        broadcast(sessionId, socket, {
          type: "presence.join",
          payload: {
            userId: userPayload.userId,
            displayName: userPayload.displayName,
            role: userPayload.role,
          },
        });

        // Handle incoming messages
        socket.on("message", async (rawMessage: Buffer | string) => {
          try {
            const data = JSON.parse(rawMessage.toString());
            if (data.type === "cursor.move" && data.cursor) {
              await store.addOrUpdateParticipant({
                id: `p_${userPayload!.userId}`,
                sessionId,
                userId: userPayload!.userId,
                displayName: userPayload!.displayName,
                role: userPayload!.role,
                color: "#2dd4bf",
                online: true,
                cursor: data.cursor,
              });
              broadcast(sessionId, socket, {
                type: "presence.cursor",
                userId: userPayload!.userId,
                cursor: data.cursor,
              });
            } else if (data.type === "ping") {
              socket.send(JSON.stringify({ type: "pong" }));
            } else {
              // Generic relay for collaborative canvas events
              broadcast(sessionId, socket, data);
            }
          } catch {
            // Ignore malformed JSON messages
          }
        });

        // Handle connection close
        socket.on("close", async () => {
          const clients = rooms.get(sessionId);
          if (clients) {
            clients.delete(client);
            if (clients.size === 0) rooms.delete(sessionId);
          }

          await store.addOrUpdateParticipant({
            id: `p_${userPayload!.userId}`,
            sessionId,
            userId: userPayload!.userId,
            displayName: userPayload!.displayName,
            role: userPayload!.role,
            color: "#2dd4bf",
            online: false,
            cursor: null,
          });

          broadcast(sessionId, socket, {
            type: "presence.leave",
            payload: { userId: userPayload!.userId },
          });
        });
      },
    );
  };
}
