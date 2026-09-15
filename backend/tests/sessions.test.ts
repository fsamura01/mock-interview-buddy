import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import { MemoryStore } from "../src/store/memory-store.js";

describe("Sessions API", () => {
  let store: MemoryStore;
  let interviewerToken: string;
  let candidateToken: string;

  beforeEach(async () => {
    store = new MemoryStore();
    await store.init();

    const app = await buildApp({ store });

    // Login as interviewer
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "ada@interviews.dev", password: "password123" },
    });
    interviewerToken = loginRes.json().data.accessToken;

    // Login as candidate
    const candLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "noah@candidate.dev", password: "password123" },
    });
    candidateToken = candLogin.json().data.accessToken;
  });

  describe("GET /api/v1/sessions", () => {
    it("lists sessions accessible to the authenticated user", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/sessions",
        headers: { authorization: `Bearer ${interviewerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.data.some((s: { id: string }) => s.id === "ses_demo")).toBe(true);
    });

    it("requires authentication", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/sessions",
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /api/v1/sessions", () => {
    it("creates a new session when requested by an interviewer", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/sessions",
        headers: { authorization: `Bearer ${interviewerToken}` },
        payload: {
          title: "Design Rate Limiter",
          prompt: "Design a distributed token bucket rate limiter.",
          durationMinutes: 45,
        },
      });

      expect(res.statusCode).toBe(201);
      const session = res.json().data;
      expect(session.id).toMatch(/^ses_/);
      expect(session.title).toBe("Design Rate Limiter");
      expect(session.status).toBe("scheduled");
      expect(session.inviteToken).toMatch(/^inv-/);
      expect(session.createdBy).toBe("u_interviewer");
    });

    it("returns 400 when title is missing", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/sessions",
        headers: { authorization: `Bearer ${interviewerToken}` },
        payload: {
          prompt: "Missing title",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("BAD_REQUEST");
    });

    it("returns 403 Forbidden when requested by candidate role", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/sessions",
        headers: { authorization: `Bearer ${candidateToken}` },
        payload: {
          title: "Unauthorized session",
          prompt: "Should fail",
        },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("FORBIDDEN");
    });
  });

  describe("POST /api/v1/sessions/join", () => {
    it("allows candidate to join with valid invite token and returns access token", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/sessions/join",
        payload: {
          token: "inv-7f3a91",
          displayName: "Alice Candidate",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json().data;
      expect(body.user.displayName).toBe("Alice Candidate");
      expect(body.session.id).toBe("ses_demo");
      expect(body.participant.sessionId).toBe("ses_demo");
      expect(typeof body.accessToken).toBe("string");
    });

    it("returns 404 for invalid invite token", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/sessions/join",
        payload: {
          token: "inv-non-existent",
          displayName: "Bob Candidate",
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/sessions/:sessionId/status", () => {
    it("updates session status and creates audit log", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "PATCH",
        url: "/api/v1/sessions/ses_demo/status",
        headers: { authorization: `Bearer ${interviewerToken}` },
        payload: { status: "paused" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe("paused");

      // Verify board status updated
      const boardRes = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/ses_demo/board",
        headers: { authorization: `Bearer ${interviewerToken}` },
      });
      expect(boardRes.json().data.session.status).toBe("paused");
    });
  });

  describe("GET /api/v1/sessions/:sessionId/board", () => {
    it("returns aggregated board data matching frontend requirements", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/ses_demo/board",
        headers: { authorization: `Bearer ${interviewerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const board = res.json().data;
      expect(board.session).toBeDefined();
      expect(board.participants.length).toBeGreaterThan(0);
      expect(board.nodes.length).toBeGreaterThan(0);
      expect(board.edges.length).toBeGreaterThan(0);
      expect(board.messages.length).toBeGreaterThan(0);
      expect(board.audit.length).toBeGreaterThan(0);
      expect(Array.isArray(board.snapshots)).toBe(true);
    });

    it("returns 404 for non-existent session board", async () => {
      const app = await buildApp({ store });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/non_existent_session/board",
        headers: { authorization: `Bearer ${interviewerToken}` },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("NOT_FOUND");
    });
  });
});
