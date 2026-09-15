# Mock Interview Buddy — Backend Agent Guide

> [!IMPORTANT]
> The backend directory is currently **empty**. This file describes the intended
> architecture derived from [`../docs/spec.md`](../docs/spec.md). Read the full
> spec before writing any code. Bootstrap the project by following the
> **Getting Started** section at the bottom of this file.

---

## Project Overview

The backend powers a real-time collaborative system design interview platform.
It exposes two interfaces to the frontend:

- **REST API** — session/user management and persistence.
- **WebSocket gateway** — real-time canvas synchronization, presence, and chat.

The full product specification (data models, permission matrix, real-time
protocol, deployment architecture) lives in [`../docs/spec.md`](../docs/spec.md).

---

## Intended Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Language | TypeScript (strict) |
| HTTP framework | Hono or Fastify |
| WebSocket | `ws` library (or framework built-in) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (RDS in production) |
| Cache / Pub-Sub | Redis (ElastiCache in production) |
| Auth | JWT validation (Clerk / Auth0 / custom OIDC) |
| Object storage | Amazon S3 (snapshots, exports) |
| Observability | OpenTelemetry → CloudWatch / Grafana |
| Containerisation | Docker + ECS/Fargate |
| Infrastructure | Terraform |
| CI/CD | GitHub Actions |

> If you are bootstrapping the project, use `npx -y create-hono@latest ./`
> (or the Fastify equivalent) in **this directory**, then add the packages above.

---

## Repository Layout (Target)

```
backend/
├── src/
│   ├── index.ts              # Entry point — HTTP + WebSocket server
│   ├── config.ts             # Env-var validation (zod)
│   ├── db/
│   │   ├── client.ts         # Drizzle DB client
│   │   ├── schema.ts         # All table definitions
│   │   └── migrations/       # SQL migration files
│   ├── redis/
│   │   └── client.ts         # Redis client + pub/sub helpers
│   ├── routes/               # REST route handlers
│   │   ├── sessions.ts       # CRUD for sessions
│   │   ├── canvas.ts         # Node/edge mutations
│   │   ├── chat.ts           # Message history
│   │   ├── snapshots.ts      # Save/restore canvas snapshots
│   │   └── audit.ts          # Audit log queries
│   ├── ws/
│   │   ├── gateway.ts        # WebSocket upgrade + connection registry
│   │   ├── handlers.ts       # Per-message-type dispatch
│   │   └── broadcaster.ts    # Fan-out to session participants via Redis pub/sub
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification + user injection
│   │   └── rbac.ts           # Role-based permission checks
│   ├── services/             # Business logic (no HTTP/WS concerns)
│   │   ├── session.service.ts
│   │   ├── canvas.service.ts
│   │   └── audit.service.ts
│   └── types/
│       └── domain.ts         # Shared TypeScript types (mirrors frontend types.ts)
├── AGENTS.md                 # ← you are here
├── Dockerfile
├── .env.example
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

---

## Data Model

Defined in detail in `docs/spec.md` sections 10–18. Key tables:

| Table | Purpose |
|---|---|
| `users` | Authenticated platform users |
| `sessions` | Interview sessions (owner, status, invite token) |
| `session_participants` | Role + presence per user per session |
| `canvas_items` | Polymorphic canvas objects (COMPONENT, EDGE, DRAWING, ANNOTATION) |
| `edges` | Directed connections between canvas items |
| `messages` | Session chat |
| `snapshots` | Point-in-time canvas state (JSONB blob) |
| `audit_logs` | Append-only operation log |

> All tables require a `session_id` column. Every operation must verify the
> requesting user is a participant of that session before proceeding (see
> **Multi-Session Isolation** in `docs/spec.md` Section 7).

---

## Key Conventions

### Multi-Session Isolation

Every handler (REST and WebSocket) must follow this guard chain:

```
Authenticated user → Participant of session? → Authorized for operation? → Apply
```

Never broadcast a session's events to a connection that belongs to a different
session. Use Redis pub/sub channels keyed by `session:<sessionId>`.

### Role-Based Permissions

Roles: `interviewer | candidate | observer | admin`

Apply the permission matrix from `docs/spec.md` Section 9 server-side.
Do **not** rely on the frontend to enforce permissions.

### REST API Design

- Base path: `/api/v1`
- All responses: `{ data: T }` on success, `{ error: { code, message } }` on failure.
- Use HTTP status codes correctly (`201` for creation, `204` for deletion, `409` for conflicts).
- Paginate list endpoints with `limit` / `cursor` query params.

### WebSocket Protocol

Every message must include `sessionId` and `operationId`:

```jsonc
// Client → Server
{ "type": "canvas.node.move", "sessionId": "ses_123", "operationId": "op_456", "payload": { ... } }

// Server → Client (broadcast)
{ "type": "canvas.node.moved", "sessionId": "ses_123", "operationId": "op_456", "actorId": "usr_789", "payload": { ... } }
```

Message types to implement (in priority order):

1. `session.join` / `session.leave`
2. `presence.cursor` — real-time cursor positions
3. `canvas.node.create` / `canvas.node.move` / `canvas.node.delete`
4. `canvas.edge.create` / `canvas.edge.delete`
5. `chat.message`
6. `session.status` — lock / pause / end controls

### Audit Logging

Write an `audit_logs` row for every significant mutation. Audit records must be
append-only from the application layer — no UPDATE or DELETE on that table.

### Environment Variables

Document every required env-var in `.env.example`. Validate them at startup with
`zod` in `src/config.ts` and crash fast if any are missing.

---

## What Needs Building (Priority Order)

- [ ] Project bootstrap (package.json, tsconfig, Dockerfile)
- [ ] DB schema + Drizzle migrations
- [ ] REST routes: sessions, canvas nodes/edges, chat, snapshots, audit
- [ ] Auth middleware (JWT)
- [ ] RBAC middleware
- [ ] WebSocket gateway + Redis pub/sub broadcaster
- [ ] Presence (cursor positions via Redis TTL keys)
- [ ] Snapshot save/restore (serialize canvas state → S3 or JSONB)
- [ ] Rate limiting
- [ ] OpenTelemetry instrumentation
- [ ] GitHub Actions CI (lint, test, build, push Docker image)
- [ ] Terraform modules (ECS, RDS, ElastiCache, ALB, CloudFront)

---

## Getting Started

```bash
# Bootstrap (run inside this directory)
npx -y create-hono@latest ./ --template nodejs

# Or with Fastify:
npx -y fastify-cli generate ./ --lang=ts

# Add core dependencies
npm install drizzle-orm pg ioredis zod jsonwebtoken @opentelemetry/sdk-node

# Add dev dependencies
npm install -D drizzle-kit tsx typescript @types/node @types/pg @types/jsonwebtoken

# Run database migrations (once DB is configured)
npx drizzle-kit migrate
```

Set up `.env` from `.env.example` before running.

regularly commit code to git