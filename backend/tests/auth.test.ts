import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../src/app.js";
import { MemoryStore } from "../src/store/memory-store.js";
import { hashPassword, comparePassword } from "../src/auth/password.js";

describe("Authentication & Password Hashing", () => {
  let store: MemoryStore;

  beforeEach(async () => {
    store = new MemoryStore();
    await store.init();
  });

  describe("Password Hashing", () => {
    it("hashes password and verifies correctly", async () => {
      const password = "mySecretPassword123";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/);

      const isMatch = await comparePassword(password, hash);
      expect(isMatch).toBe(true);

      const isWrong = await comparePassword("wrongPassword", hash);
      expect(isWrong).toBe(false);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("successfully logs in with valid credentials and returns accessToken", async () => {
      const app = await buildApp({ store });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "ada@interviews.dev",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data.user.email).toBe("ada@interviews.dev");
      expect(body.data.user.role).toBe("interviewer");
      expect(body.data.user.passwordHash).toBeUndefined(); // Never expose password hash!
      expect(typeof body.data.accessToken).toBe("string");
      expect(body.data.accessToken.length).toBeGreaterThan(20);
    });

    it("returns 401 with invalid password", async () => {
      const app = await buildApp({ store });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "ada@interviews.dev",
          password: "incorrectPassword",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 with non-existent email", async () => {
      const app = await buildApp({ store });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "unknown@nobody.com",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("returns 400 for invalid email format", async () => {
      const app = await buildApp({ store });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "not-an-email",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe("BAD_REQUEST");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns 401 when authorization header is missing", async () => {
      const app = await buildApp({ store });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 when authorization header contains invalid token", async () => {
      const app = await buildApp({ store });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          authorization: "Bearer invalid.garbage.token",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe("UNAUTHORIZED");
    });

    it("returns current user when valid bearer token is provided", async () => {
      const app = await buildApp({ store });

      // First login
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "ada@interviews.dev",
          password: "password123",
        },
      });
      const token = loginRes.json().data.accessToken;

      // Now call me
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meRes.statusCode).toBe(200);
      const user = meRes.json().data;
      expect(user.id).toBe("u_interviewer");
      expect(user.displayName).toBe("Ada Mensah");
      expect(user.role).toBe("interviewer");
      expect(user.passwordHash).toBeUndefined();
    });
  });
});
