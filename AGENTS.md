<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Mock Interview Buddy — Monorepo Agent Guide

## Project Overview

**Whiteboarder Interview Studio** is a real-time collaborative system design interview platform. Interviewers and candidates share a live architecture canvas where they place system components, draw connections, annotate, and chat — all synchronized in real time.

The source of truth for all requirements, data models, permissions, and protocols is [`docs/spec.md`](./docs/spec.md). **Always consult `docs/spec.md` before making architectural decisions or implementing new features.**

---

## Repository Structure

```
mock-interview-buddy/
├── backend/                  # Backend application and its tests
│   ├── AGENTS.md             # Detailed guide & instructions for backend agents
│   └── ...                   # Node.js, TypeScript, REST API & WebSocket server
├── docs/                     # Supporting documentation
│   └── spec.md               # Complete platform specification (50+ pages)
├── frontend/                 # Frontend application
│   ├── AGENTS.md             # Detailed guide & instructions for frontend agents
│   ├── package.json
│   ├── vite.config.ts
│   └── src/                  # TanStack Start + React 19 + Tailwind CSS canvas
└── AGENTS.md                 # ← you are here (root monorepo guide)
```

---

## Workspace Navigation & Sub-Agent Guides

When working on specific subsystems, refer to the dedicated agent guides:

- **Backend Development**: Consult [`backend/AGENTS.md`](./backend/AGENTS.md) for target architecture, Drizzle DB schema, REST routes, WebSocket broadcaster, and getting started instructions.
- **Frontend Development**: Consult [`frontend/AGENTS.md`](./frontend/AGENTS.md) for TanStack Start SSR, TanStack Router file-based routing, component architecture, `PlatformApi` interface, and canvas state management.
- **System Specification & Architecture**: Consult [`docs/spec.md`](./docs/spec.md) for full data models, permission matrix, WebSocket payload schemas, and deployment topology.

---

## Core Conventions & Rules

### 1. Specification as Source of Truth
Never invent ad-hoc protocols, entity schemas, or role permissions. Verify all implementations against [`docs/spec.md`](./docs/spec.md):
- Section 9: Permission Matrix (`interviewer`, `candidate`, `observer`, `admin`)
- Section 10–18: Data models (`users`, `sessions`, `session_participants`, `canvas_items`, `edges`, `messages`, `snapshots`, `audit_logs`)
- Section 19: Real-time synchronization protocol (`sessionId`, `operationId`, actor tracking)

### 2. Cross-Tier Protocol & API
- **REST Endpoints**: Base path `/api/v1`. Structured envelopes `{ data: T }` on success and `{ error: { code, message } }` on failure.
- **Real-Time WebSocket Gateway**: Redis pub/sub channel per session (`session:<sessionId>`). Multi-session isolation must be strictly enforced at every gateway boundary.
- **Shared Types**: Keep domain models aligned between [`frontend/src/services/types.ts`](./frontend/src/services/types.ts) and the backend type definitions.

### 3. Git & Lovable Safety
- **Keep Working Commits**: Do not break the build. Commits pushed to the connected branch automatically sync with Lovable.
- **No Destructive Git**: Never force-push or rewrite published git history (squash/rebase).
- **Regular Commits**: Commit code regularly with clear, imperative messages (`Add snapshot panel`, `Fix edge deletion bug`).

---

## Development Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:3000` by default.

### Backend
```bash
cd backend
# See backend/AGENTS.md for bootstrap and development instructions
```

---

regularly commit code to git
