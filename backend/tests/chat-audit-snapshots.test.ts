import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import { MemoryStore } from "../src/store/memory-store.js";

describe("Chat, Audit & Snapshots API", () => {
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

  describe("Chat Messages", () => {
    it("lists chat messages", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/sessions/${sessionId}/messages`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const messages = res.json().data;
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });

    it("sends a new chat message", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/sessions/${sessionId}/messages`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          body: "Let's use a Bloom filter before hitting Redis.",
        },
      });

      expect(res.statusCode).toBe(201);
      const msg = res.json().data;
      expect(msg.id).toMatch(/^msg_/);
      expect(msg.body).toBe("Let's use a Bloom filter before hitting Redis.");
      expect(msg.authorName).toBe("Ada Mensah");
    });

    it("rejects empty message body", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/sessions/${sessionId}/messages`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          body: "",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("BAD_REQUEST");
    });
  });

  describe("Audit Trail", () => {
    it("retrieves the append-only audit trail", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/sessions/${sessionId}/audit`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const audit = res.json().data;
      expect(Array.isArray(audit)).toBe(true);
      expect(audit.length).toBeGreaterThan(0);
      expect(audit[0].action).toBeDefined();
      expect(audit[0].actorName).toBeDefined();
    });
  });

  describe("Snapshots", () => {
    it("creates, lists, and restores snapshots", async () => {
      const app = await buildApp({ store });

      // 1. Create a snapshot of current state
      const saveRes = await app.inject({
        method: "POST",
        url: `/api/v1/sessions/${sessionId}/snapshots`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          label: "Phase 1 - High Level Design",
        },
      });

      expect(saveRes.statusCode).toBe(201);
      const snapshot = saveRes.json().data;
      expect(snapshot.id).toMatch(/^snp_/);
      expect(snapshot.label).toBe("Phase 1 - High Level Design");
      expect(snapshot.nodes.length).toBe(5);

      // 2. List snapshots
      const listRes = await app.inject({
        method: "GET",
        url: `/api/v1/sessions/${sessionId}/snapshots`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json().data.length).toBe(1);

      // 3. Mutate canvas (delete nodes, add new one)
      await app.inject({
        method: "DELETE",
        url: `/api/v1/sessions/${sessionId}/nodes/nd_client`,
        headers: { authorization: `Bearer ${token}` },
      });
      await app.inject({
        method: "DELETE",
        url: `/api/v1/sessions/${sessionId}/nodes/nd_gateway`,
        headers: { authorization: `Bearer ${token}` },
      });

      // Verify board has fewer nodes now
      const mutatedBoardRes = await app.inject({
        method: "GET",
        url: `/api/v1/sessions/${sessionId}/board`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(mutatedBoardRes.json().data.nodes.length).toBe(3);

      // 4. Restore the snapshot
      const restoreRes = await app.inject({
        method: "POST",
        url: `/api/v1/sessions/${sessionId}/snapshots/${snapshot.id}/restore`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(restoreRes.statusCode).toBe(200);
      const restoredBoard = restoreRes.json().data;
      expect(restoredBoard.nodes.length).toBe(5); // restored all 5 original nodes!
      expect(restoredBoard.nodes.some((n: { id: string }) => n.id === "nd_client")).toBe(true);
    });

    it("returns 404 when restoring non-existent snapshot", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/sessions/${sessionId}/snapshots/snp_missing/restore`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NOT_FOUND");
    });
  });
});
