# Implementation Plan - Node.js + TypeScript Backend for Mock Interview Buddy

Implement a clean, modular Fastify + TypeScript backend in `backend/` strictly adhering to [`openapi.yaml`](file:///d:/Learning/ai-dev-tools-experiment/ai-system-design-canvas/mock-interview-buddy/openapi.yaml).

## User Review Required

> [!IMPORTANT]
> - **In-Memory Store Architecture**: A repository interface (`Store`) decouples the API routes and business logic from the underlying storage, allowing seamless transition to PostgreSQL / Drizzle in the future.
> - **Seed Data**: Pre-loaded with realistic interview sessions (e.g. `ses_demo`), users (Interviewer `Ada Mensah`, Candidate `Noah Chen`), nodes, edges, chat messages, and snapshots matching the frontend mock expectations.
> - **Auth & Password Security**: Uses `bcryptjs` for secure password hashing and JWT bearer tokens (`@fastify/jwt`) for protected endpoints. We will add `POST /api/v1/auth/login` to `openapi.yaml` and the backend to provide credential login alongside `POST /api/v1/sessions/join`.

## Proposed Changes

### 1. Project Setup & Configuration
- [`mock-interview-buddy/backend/package.json`](file:///d:/Learning/ai-dev-tools-experiment/ai-system-design-canvas/mock-interview-buddy/backend/package.json): Defines scripts (`dev`, `build`, `start`, `test`), dependencies (`fastify`, `@fastify/cors`, `@fastify/jwt`, `@fastify/websocket`, `bcryptjs`, `zod`), and devDependencies (`typescript`, `@types/node`, `vitest`, `tsx`, `@types/bcryptjs`).
- [`mock-interview-buddy/backend/tsconfig.json`](file:///d:/Learning/ai-dev-tools-experiment/ai-system-design-canvas/mock-interview-buddy/backend/tsconfig.json): Strict TypeScript configuration targeting Node 20.
- [`mock-interview-buddy/backend/vitest.config.ts`](file:///d:/Learning/ai-dev-tools-experiment/ai-system-design-canvas/mock-interview-buddy/backend/vitest.config.ts): Vitest configuration.

### 2. OpenAPI Update
- [`mock-interview-buddy/openapi.yaml`](file:///d:/Learning/ai-dev-tools-experiment/ai-system-design-canvas/mock-interview-buddy/openapi.yaml): Add `POST /api/v1/auth/login` so interviewers can log in with email/password and obtain a JWT bearer token.

### 3. Models & Schemas
- `backend/src/models/domain.ts`: Strict TypeScript domain interfaces (`User`, `Session`, `Participant`, `CanvasNode`, `CanvasEdge`, `ChatMessage`, `AuditEntry`, `Snapshot`, `SessionBoard`).
- `backend/src/schemas/index.ts`: Zod validation schemas for all request payloads (sessions, nodes, edges, chat, snapshots, status, login, join).

### 4. Store & Seed Data
- `backend/src/store/interface.ts`: Interface defining all repository access methods.
- `backend/src/store/memory-store.ts`: Thread-safe, encapsulated in-memory store.
- `backend/src/store/seed.ts`: Seed data matching frontend demo expectations with pre-hashed bcrypt passwords.

### 5. Authentication & Security
- `backend/src/auth/jwt.ts`: Token generation, verification, and route protection hooks.
- `backend/src/auth/password.ts`: `hashPassword` and `comparePassword` using bcrypt.

### 6. Route Handlers
- `backend/src/routes/auth.ts`: `POST /api/v1/auth/login` and `GET /api/v1/auth/me`.
- `backend/src/routes/sessions.ts`: CRUD for sessions, `POST /api/v1/sessions/join`, `PATCH status`, and aggregated `GET /api/v1/sessions/:sessionId/board`.
- `backend/src/routes/canvas.ts`: Node & edge CRUD (`POST/PATCH/DELETE nodes`, `POST/DELETE edges`).
- `backend/src/routes/chat.ts`: `GET/POST messages`.
- `backend/src/routes/audit.ts`: `GET audit`.
- `backend/src/routes/snapshots.ts`: `GET/POST snapshots`, `POST restore`.
- `backend/src/routes/realtime.ts`: WebSocket route `/api/v1/sessions/:sessionId/ws` for live broadcasting.

### 7. App Setup & Entry Point
- `backend/src/app.ts`: Fastify application factory registering plugins (CORS, JWT, WebSocket), error handlers, and route modules.
- `backend/src/server.ts`: Server entrypoint listening on `PORT` (default: 8000).
- `backend/README.md`: Developer documentation covering installation, running dev server, tests, auth, store, and openapi mapping.

### 8. Vitest Automated Test Suite
- `backend/tests/auth.test.ts`: Password hashing, token generation, login verification, protected routes (valid, missing, invalid token).
- `backend/tests/sessions.test.ts`: List, create, get, join, status update, and board retrieval.
- `backend/tests/canvas.test.ts`: Node creation, update with version bump, deletion with edge cascading, and edge creation/deletion.
- `backend/tests/chat-audit-snapshots.test.ts`: Chat sending, audit log verification, snapshot capture and restore.

## Verification Plan

### Automated Tests
- Run `npm test` inside `backend/` executing all Vitest test suites.
- Run `npm run build` to verify TypeScript compile succeeds with zero errors.

### Manual / Sanity Verification
- Start the server (`npm run dev`) and test endpoints using `fastify.inject` or curl requests against local server.
