// Mock implementation of PlatformApi. Keeps everything in memory (persisted to
// localStorage in the browser) and simulates network latency, a second
// participant moving their cursor, and live board push updates.

import type { PlatformApi } from "../api";
import type {
  AuditEntry,
  CanvasEdge,
  CanvasNode,
  ChatMessage,
  CreateSessionInput,
  Participant,
  Session,
  SessionBoard,
  Snapshot,
  User,
} from "../types";

const STORAGE_KEY = "sdi.mock.db.v1";
const LATENCY = 120;

interface Db {
  sessions: Session[];
  participants: Participant[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  messages: ChatMessage[];
  audit: AuditEntry[];
  snapshots: Snapshot[];
}

const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
const wait = <T,>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), LATENCY));

export const CURRENT_USER: User = {
  id: "u_interviewer",
  displayName: "Ada Mensah",
  email: "ada@interviews.dev",
  role: "interviewer",
  color: "#f0b429",
};

const CANDIDATE: User = {
  id: "u_candidate",
  displayName: "Noah Chen",
  email: "noah@candidate.dev",
  role: "candidate",
  color: "#2dd4bf",
};

function seed(): Db {
  const sessionId = "ses_demo";
  const db: Db = {
    sessions: [
      {
        id: sessionId,
        title: "Design a URL shortener",
        prompt:
          "Design a highly available URL shortening service handling 10k writes/s and 1M reads/s with analytics.",
        status: "active",
        createdAt: now(),
        createdBy: CURRENT_USER.id,
        inviteToken: "inv-7f3a91",
        durationMinutes: 60,
      },
      {
        id: "ses_feed",
        title: "Design a news feed",
        prompt: "Design a personalized feed for 50M daily active users with fan-out on write.",
        status: "scheduled",
        createdAt: now(),
        createdBy: CURRENT_USER.id,
        inviteToken: "inv-22c108",
        durationMinutes: 45,
      },
    ],
    participants: [
      {
        id: "p1",
        sessionId,
        userId: CURRENT_USER.id,
        displayName: CURRENT_USER.displayName,
        role: "interviewer",
        color: CURRENT_USER.color,
        online: true,
        cursor: null,
      },
      {
        id: "p2",
        sessionId,
        userId: CANDIDATE.id,
        displayName: CANDIDATE.displayName,
        role: "candidate",
        color: CANDIDATE.color,
        online: true,
        cursor: { x: 420, y: 260 },
      },
      {
        id: "p3",
        sessionId,
        userId: "u_obs",
        displayName: "Priya Raman",
        role: "observer",
        color: "#94a3b8",
        online: false,
        cursor: null,
      },
    ],
    nodes: [
      mkNode(sessionId, "client", "Web Client", 80, 120),
      mkNode(sessionId, "gateway", "API Gateway", 330, 120),
      mkNode(sessionId, "service", "Shortener Service", 580, 60),
      mkNode(sessionId, "cache", "Redis Cache", 580, 240),
      mkNode(sessionId, "database", "Postgres", 840, 150),
    ],
    edges: [],
    messages: [
      {
        id: id("msg"),
        sessionId,
        authorId: CANDIDATE.id,
        authorName: CANDIDATE.displayName,
        body: "Starting with read-heavy assumptions — 100:1 read to write ratio.",
        createdAt: now(),
      },
    ],
    audit: [
      {
        id: id("aud"),
        sessionId,
        actorName: CURRENT_USER.displayName,
        action: "session.started",
        detail: "Session opened for collaboration",
        createdAt: now(),
      },
    ],
    snapshots: [],
  };

  const [client, gateway, service, cache, dbNode] = db.nodes;
  db.edges = [
    mkEdge(sessionId, client!.id, gateway!.id, "HTTPS", "http"),
    mkEdge(sessionId, gateway!.id, service!.id, "REST", "http"),
    mkEdge(sessionId, service!.id, cache!.id, "lookup", "async"),
    mkEdge(sessionId, service!.id, dbNode!.id, "persist", "sql"),
  ];
  return db;
}

function mkNode(sessionId: string, kind: CanvasNode["kind"], label: string, x: number, y: number): CanvasNode {
  return { id: id("nd"), sessionId, kind, label, notes: "", x, y, width: 176, height: 84, version: 1 };
}

function mkEdge(
  sessionId: string,
  fromNodeId: string,
  toNodeId: string,
  label: string,
  protocol: CanvasEdge["protocol"],
): CanvasEdge {
  return { id: id("eg"), sessionId, fromNodeId, toNodeId, label, protocol };
}

let db: Db = load();

function load(): Db {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* fall through to seed */
  }
  const fresh = seed();
  persist(fresh);
  return fresh;
}

function persist(next: Db = db) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — mock keeps working in memory */
  }
}

const listeners = new Map<string, Set<(board: SessionBoard) => void>>();

function boardOf(sessionId: string): SessionBoard {
  const session = db.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");
  return {
    session,
    participants: db.participants.filter((p) => p.sessionId === sessionId),
    nodes: db.nodes.filter((n) => n.sessionId === sessionId),
    edges: db.edges.filter((e) => e.sessionId === sessionId),
    messages: db.messages.filter((m) => m.sessionId === sessionId),
    audit: db.audit.filter((a) => a.sessionId === sessionId).slice().reverse(),
    snapshots: db.snapshots.filter((s) => s.sessionId === sessionId),
  };
}

function emit(sessionId: string) {
  persist();
  const set = listeners.get(sessionId);
  if (!set) return;
  const board = boardOf(sessionId);
  set.forEach((fn) => fn(board));
}

function log(sessionId: string, action: string, detail: string) {
  db.audit.push({
    id: id("aud"),
    sessionId,
    actorName: CURRENT_USER.displayName,
    action,
    detail,
    createdAt: now(),
  });
}

export const mockApi: PlatformApi = {
  async getCurrentUser() {
    return wait(CURRENT_USER);
  },

  async listSessions() {
    return wait(db.sessions.slice());
  },

  async createSession(input: CreateSessionInput) {
    const session: Session = {
      id: id("ses"),
      title: input.title,
      prompt: input.prompt,
      durationMinutes: input.durationMinutes,
      status: "scheduled",
      createdAt: now(),
      createdBy: CURRENT_USER.id,
      inviteToken: `inv-${Math.random().toString(16).slice(2, 8)}`,
    };
    db.sessions.unshift(session);
    db.participants.push({
      id: id("par"),
      sessionId: session.id,
      userId: CURRENT_USER.id,
      displayName: CURRENT_USER.displayName,
      role: "interviewer",
      color: CURRENT_USER.color,
      online: true,
      cursor: null,
    });
    log(session.id, "session.created", session.title);
    persist();
    return wait(session);
  },

  async getBoard(sessionId: string) {
    return wait(boardOf(sessionId));
  },

  async setSessionStatus(sessionId, status) {
    const session = db.sessions.find((s) => s.id === sessionId)!;
    session.status = status;
    log(sessionId, `session.${status}`, `Status set to ${status}`);
    emit(sessionId);
    return wait(session);
  },

  async createNode(sessionId, node) {
    const created: CanvasNode = { ...node, id: id("nd"), sessionId, version: 1 };
    db.nodes.push(created);
    log(sessionId, "node.created", `${created.kind} · ${created.label}`);
    emit(sessionId);
    return wait(created);
  },

  async updateNode(sessionId, nodeId, patch) {
    const node = db.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error("Node not found");
    Object.assign(node, patch, { version: node.version + 1 });
    if (patch.label || patch.notes) log(sessionId, "node.updated", node.label);
    emit(sessionId);
    return wait(node);
  },

  async deleteNode(sessionId, nodeId) {
    const node = db.nodes.find((n) => n.id === nodeId);
    db.nodes = db.nodes.filter((n) => n.id !== nodeId);
    db.edges = db.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId);
    log(sessionId, "node.deleted", node?.label ?? nodeId);
    emit(sessionId);
    return wait(undefined);
  },

  async createEdge(sessionId, edge) {
    const exists = db.edges.some(
      (e) => e.fromNodeId === edge.fromNodeId && e.toNodeId === edge.toNodeId,
    );
    if (exists) return wait(db.edges.find((e) => e.fromNodeId === edge.fromNodeId)!);
    const created: CanvasEdge = { ...edge, id: id("eg"), sessionId };
    db.edges.push(created);
    log(sessionId, "edge.created", created.label || created.protocol);
    emit(sessionId);
    return wait(created);
  },

  async deleteEdge(sessionId, edgeId) {
    db.edges = db.edges.filter((e) => e.id !== edgeId);
    log(sessionId, "edge.deleted", edgeId);
    emit(sessionId);
    return wait(undefined);
  },

  async sendMessage(sessionId, body) {
    const message: ChatMessage = {
      id: id("msg"),
      sessionId,
      authorId: CURRENT_USER.id,
      authorName: CURRENT_USER.displayName,
      body,
      createdAt: now(),
    };
    db.messages.push(message);
    emit(sessionId);
    return wait(message);
  },

  async listAudit(sessionId) {
    return wait(boardOf(sessionId).audit);
  },

  async saveSnapshot(sessionId, label) {
    const board = boardOf(sessionId);
    const snapshot: Snapshot = {
      id: id("snp"),
      sessionId,
      label,
      createdAt: now(),
      nodes: JSON.parse(JSON.stringify(board.nodes)),
      edges: JSON.parse(JSON.stringify(board.edges)),
    };
    db.snapshots.push(snapshot);
    log(sessionId, "snapshot.saved", label);
    emit(sessionId);
    return wait(snapshot);
  },

  async restoreSnapshot(sessionId, snapshotId) {
    const snapshot = db.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) throw new Error("Snapshot not found");
    db.nodes = db.nodes.filter((n) => n.sessionId !== sessionId).concat(JSON.parse(JSON.stringify(snapshot.nodes)));
    db.edges = db.edges.filter((e) => e.sessionId !== sessionId).concat(JSON.parse(JSON.stringify(snapshot.edges)));
    log(sessionId, "snapshot.restored", snapshot.label);
    emit(sessionId);
    return wait(boardOf(sessionId));
  },

  subscribe(sessionId, onChange) {
    let set = listeners.get(sessionId);
    if (!set) {
      set = new Set();
      listeners.set(sessionId, set);
    }
    set.add(onChange);

    // Simulated remote presence: the candidate's cursor drifts around.
    const timer = setInterval(() => {
      const peer = db.participants.find(
        (p) => p.sessionId === sessionId && p.userId === CANDIDATE.id && p.online,
      );
      if (!peer) return;
      const base = peer.cursor ?? { x: 400, y: 260 };
      peer.cursor = {
        x: Math.max(40, Math.min(1100, base.x + (Math.random() - 0.5) * 90)),
        y: Math.max(40, Math.min(640, base.y + (Math.random() - 0.5) * 70)),
      };
      emit(sessionId);
    }, 1600);

    return () => {
      clearInterval(timer);
      set!.delete(onChange);
    };
  },
};

/** Test helper: reset the mock database to its seeded state. */
export function resetMockDb() {
  db = seed();
  persist();
}
