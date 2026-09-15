import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import { MemoryStore } from "../src/store/memory-store.js";

describe("Canvas Nodes & Edges API", () => {
  let store: MemoryStore;
  let token: string;
  const sessionId = "ses_demo";

  beforeEach(async () => {
    store = new MemoryStore();
    await store.init();

    const app = await buildApp({ store });
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "ada@interviews.dev", password: "password123" },
    });
    token = loginRes.json().data.accessToken;
  });

  describe("Nodes", () => {
    it("creates a new node with version = 1", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/sessions/${sessionId}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          kind: "queue",
          label: "Kafka Message Queue",
          notes: "Buffer writes",
          x: 400,
          y: 400,
          width: 176,
          height: 84,
        },
      });

      expect(res.statusCode).toBe(201);
      const node = res.json().data;
      expect(node.id).toMatch(/^nd_/);
      expect(node.sessionId).toBe(sessionId);
      expect(node.kind).toBe("queue");
      expect(node.label).toBe("Kafka Message Queue");
      expect(node.version).toBe(1);
    });

    it("fails with 400 when kind is invalid", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/sessions/${sessionId}/nodes`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          kind: "invalid-architecture-component",
          label: "Test",
          x: 100,
          y: 100,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("BAD_REQUEST");
    });

    it("updates an existing node and increments version", async () => {
      const app = await buildApp({ store });

      // First check existing client node
      const updateRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/sessions/${sessionId}/nodes/nd_client`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          x: 150,
          y: 200,
          label: "Mobile & Web Client",
        },
      });

      expect(updateRes.statusCode).toBe(200);
      const updated = updateRes.json().data;
      expect(updated.x).toBe(150);
      expect(updated.y).toBe(200);
      expect(updated.label).toBe("Mobile & Web Client");
      expect(updated.version).toBe(2); // incremented from 1 to 2!
    });

    it("returns 404 when updating non-existent node", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/sessions/${sessionId}/nodes/nd_non_existent`,
        headers: { authorization: `Bearer ${token}` },
        payload: { x: 50 },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NOT_FOUND");
    });

    it("deletes a node and cascades removal to connected edges", async () => {
      const app = await buildApp({ store });

      // In seed data, eg_1 connects nd_client to nd_gateway
      const delRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/sessions/${sessionId}/nodes/nd_client`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(delRes.statusCode).toBe(204);

      // Verify node is gone
      const boardRes = await app.inject({
        method: "GET",
        url: `/api/v1/sessions/${sessionId}/board`,
        headers: { authorization: `Bearer ${token}` },
      });
      const board = boardRes.json().data;
      expect(board.nodes.some((n: { id: string }) => n.id === "nd_client")).toBe(false);

      // Verify eg_1 was cascade deleted
      expect(board.edges.some((e: { id: string }) => e.id === "eg_1")).toBe(false);
    });
  });

  describe("Edges", () => {
    it("creates a connection between two existing nodes", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/sessions/${sessionId}/edges`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          fromNodeId: "nd_client",
          toNodeId: "nd_service",
          label: "Direct gRPC",
          protocol: "grpc",
        },
      });

      expect(res.statusCode).toBe(201);
      const edge = res.json().data;
      expect(edge.id).toMatch(/^eg_/);
      expect(edge.protocol).toBe("grpc");
      expect(edge.label).toBe("Direct gRPC");
    });

    it("rejects edge creation if node does not exist", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/sessions/${sessionId}/edges`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          fromNodeId: "nd_client",
          toNodeId: "nd_ghost_node",
          protocol: "http",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("BAD_REQUEST");
    });

    it("deletes an existing edge", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/sessions/${sessionId}/edges/eg_1`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(204);

      const boardRes = await app.inject({
        method: "GET",
        url: `/api/v1/sessions/${sessionId}/board`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(boardRes.json().data.edges.some((e: { id: string }) => e.id === "eg_1")).toBe(false);
    });

    it("returns 404 when deleting a non-existent edge", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/sessions/${sessionId}/edges/eg_missing`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NOT_FOUND");
    });
  });
});
