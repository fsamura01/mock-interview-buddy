# Mock Interview Buddy — Backend API

Node.js and TypeScript backend service built with **Fastify**, strictly implementing the contract defined in [`openapi.yaml`](../openapi.yaml). It powers the real-time collaborative system design interview platform for interviewers, candidates, observers, and administrators.

---

## 1. Installation

From within `backend/`:

```bash
npm install
```

---

## 2. Running the Server

### Development Mode
Runs the TypeScript server directly using `tsx watch` with instant hot reloading:

```bash
npm run dev
```

### Production Build & Run
Compiles TypeScript into `dist/` and runs the production server:

```bash
npm run build
npm run start
```

Default server URL: `http://localhost:8000`  
API Base Path: `http://localhost:8000/api/v1`  
WebSocket Endpoint: `ws://localhost:8000/api/v1/sessions/:sessionId/ws`

The server automatically initializes and loads seed data upon startup, enabling the frontend to immediately render realistic sessions, nodes, edges, messages, and audit logs.

---

## 3. Running Tests

Run the automated test suite powered by **Vitest**:

```bash
npm test
```

The test suite covers:
- Password hashing & verification (`bcryptjs`)
- Authentication (`POST /api/v1/auth/login`, `GET /api/v1/auth/me`)
- Protected endpoints with valid, missing, and invalid JWT tokens
- Role-based authorization (`403 Forbidden` for restricted actions)
- Session lifecycle & candidate invite joins (`POST /api/v1/sessions/join`)
- Canvas node creation, optimistic concurrency version bumps, and cascading edge deletions
- Edge creation with node existence validation and deletion
- Chat messaging with validation
- Point-in-time snapshot saving, listing, and restoration
- Error handling and standard envelopes (`400`, `401`, `403`, `404`)

---

## 4. How Authentication Works

Authentication adheres strictly to the security definitions in `openapi.yaml`:

1. **Password Security**: User passwords are stored only as one-way **bcrypt** hashes (`bcryptjs`, 10 salt rounds). Plaintext passwords are never stored or leaked.
2. **Login**:
   - `POST /api/v1/auth/login` accepts `{ email, password }`.
   - On success, it issues a signed **JWT Bearer token** (`@fastify/jwt`) containing the user's ID, email, role, and display name.
3. **Candidate Invite Join**:
   - `POST /api/v1/sessions/join` allows candidates to join a session using a shareable invite token (e.g. `inv-7f3a91`) without pre-registration. It creates their participant record and returns a scoped session JWT.
4. **Token Verification**:
   - Protected endpoints require the `Authorization: Bearer <token>` HTTP header.
   - For WebSockets, the token can also be passed via the `?token=<jwt>` query parameter.
   - Missing or invalid tokens return standard `401 Unauthorized` envelopes (`{ error: { code: "UNAUTHORIZED", message: "..." } }`).
   - Insufficient permissions return `403 Forbidden`.

### Default Seed Accounts

| Email | Password | Role | Description |
|---|---|---|---|
| `ada@interviews.dev` | `password123` | `interviewer` | Primary Interviewer (Ada Mensah) |
| `noah@candidate.dev` | `password123` | `candidate` | Candidate (Noah Chen) |
| `admin@interviews.dev`| `password123` | `admin` | Administrator |
| `priya@observer.dev` | `password123` | `observer` | Read-only Observer |

---

## 5. How the In-Memory Store Works

The data storage layer is completely decoupled behind the `IStore` interface (`src/store/interface.ts`):

```text
Routes / Handlers  ───>  IStore Interface  ───>  MemoryStore (In-Memory Maps & Arrays)
                                        └───>  [Future: PostgreSQL / Drizzle]
```

- **Thread-safe & In-Memory**: Uses native JS `Map` and collections for fast in-memory lookups without external database dependencies.
- **Seed Data**: Pre-loaded on initialization (`src/store/seed.ts`) with realistic data matching the frontend's mock database (`ses_demo` with 5 components, 4 edges, chat messages, and audit trail).
- **Optimistic Concurrency**: `updateNode` automatically increments the `version` field.
- **Cascading Deletes**: Deleting a node automatically cleans up all associated edges.
- **Pluggable Architecture**: Swapping in PostgreSQL + Drizzle ORM in the future requires only implementing the `IStore` interface without altering any HTTP route handlers or validation logic.

---

## 6. How the API Maps to `openapi.yaml`

| Endpoint | Method | Route File | Description | Auth Required |
|---|---|---|---|---|
| `/api/v1/auth/login` | `POST` | `src/routes/auth.ts` | Authenticate with credentials and receive JWT | Public |
| `/api/v1/auth/me` | `GET` | `src/routes/auth.ts` | Get current user profile | `BearerAuth` |
| `/api/v1/sessions/join` | `POST` | `src/routes/sessions.ts` | Join session via invite token | Public (Invite Token) |
| `/api/v1/sessions` | `GET` | `src/routes/sessions.ts` | List user sessions | `BearerAuth` |
| `/api/v1/sessions` | `POST` | `src/routes/sessions.ts` | Create new interview session | `BearerAuth` (Interviewer/Admin) |
| `/api/v1/sessions/:id` | `GET` | `src/routes/sessions.ts` | Get session metadata | `BearerAuth` |
| `/api/v1/sessions/:id/status` | `PATCH` | `src/routes/sessions.ts` | Update session status (`active`, `paused`, `ended`) | `BearerAuth` (Interviewer/Admin) |
| `/api/v1/sessions/:id/board` | `GET` | `src/routes/sessions.ts` | Get aggregated session board (initial load) | `BearerAuth` |
| `/api/v1/sessions/:id/nodes` | `POST` | `src/routes/canvas.ts` | Place architecture component node | `BearerAuth` |
| `/api/v1/sessions/:id/nodes/:nodeId` | `PATCH` | `src/routes/canvas.ts` | Move / resize / rename canvas node | `BearerAuth` |
| `/api/v1/sessions/:id/nodes/:nodeId` | `DELETE`| `src/routes/canvas.ts` | Delete node and connected edges | `BearerAuth` |
| `/api/v1/sessions/:id/edges` | `POST` | `src/routes/canvas.ts` | Connect two nodes with protocol edge | `BearerAuth` |
| `/api/v1/sessions/:id/edges/:edgeId` | `DELETE`| `src/routes/canvas.ts` | Delete connection edge | `BearerAuth` |
| `/api/v1/sessions/:id/messages` | `GET` | `src/routes/chat.ts` | Fetch chat message history | `BearerAuth` |
| `/api/v1/sessions/:id/messages` | `POST` | `src/routes/chat.ts` | Post new chat message | `BearerAuth` |
| `/api/v1/sessions/:id/audit` | `GET` | `src/routes/audit.ts` | Fetch append-only audit trail | `BearerAuth` |
| `/api/v1/sessions/:id/snapshots` | `GET` | `src/routes/snapshots.ts` | List saved canvas snapshots | `BearerAuth` |
| `/api/v1/sessions/:id/snapshots` | `POST` | `src/routes/snapshots.ts` | Capture current canvas snapshot | `BearerAuth` |
| `/api/v1/sessions/:id/snapshots/:snapshotId/restore` | `POST` | `src/routes/snapshots.ts` | Restore canvas to snapshot state | `BearerAuth` (Interviewer/Admin) |
| `/api/v1/sessions/:id/ws` | `GET` (WS) | `src/routes/realtime.ts` | WebSocket upgrade for live collaboration & presence | `BearerAuth` or `?token=` |

---

## 7. Error Format

All error responses strictly follow the standard error envelope from `openapi.yaml`:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Title is required",
    "details": { ... }
  }
}
```
