import type {
  AuditEntry,
  CanvasEdge,
  CanvasNode,
  ChatMessage,
  CreateSessionInput,
  Participant,
  Session,
  SessionBoard,
  SessionStatus,
  Snapshot,
  User,
} from "../models/domain.js";
import type { IStore } from "./interface.js";
import { createSeedData, type SeedData } from "./seed.js";

const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();

export class MemoryStore implements IStore {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private participants: Participant[] = [];
  private nodes: CanvasNode[] = [];
  private edges: CanvasEdge[] = [];
  private messages: ChatMessage[] = [];
  private audit: AuditEntry[] = [];
  private snapshots: Snapshot[] = [];

  constructor() {}

  async init(): Promise<void> {
    const seed = await createSeedData();
    this.loadSeed(seed);
  }

  private loadSeed(seed: SeedData): void {
    this.users.clear();
    this.sessions.clear();

    for (const u of seed.users) this.users.set(u.id, { ...u });
    for (const s of seed.sessions) this.sessions.set(s.id, { ...s });
    this.participants = seed.participants.map((p) => ({ ...p }));
    this.nodes = seed.nodes.map((n) => ({ ...n }));
    this.edges = seed.edges.map((e) => ({ ...e }));
    this.messages = seed.messages.map((m) => ({ ...m }));
    this.audit = seed.audit.map((a) => ({ ...a }));
    this.snapshots = seed.snapshots.map((s) => ({ ...s }));
  }

  async reset(): Promise<void> {
    const seed = await createSeedData();
    this.loadSeed(seed);
  }

  // Users
  async getUserById(userId: string): Promise<User | undefined> {
    const u = this.users.get(userId);
    return u ? { ...u } : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return { ...u };
      }
    }
    return undefined;
  }

  async createUser(user: User): Promise<User> {
    this.users.set(user.id, { ...user });
    return { ...user };
  }

  // Sessions
  async listSessions(userId?: string): Promise<Session[]> {
    const all = Array.from(this.sessions.values());
    if (!userId) return all.map((s) => ({ ...s }));

    // User is creator OR participant
    const joinedSessionIds = new Set(
      this.participants.filter((p) => p.userId === userId).map((p) => p.sessionId),
    );
    return all
      .filter((s) => s.createdBy === userId || joinedSessionIds.has(s.id))
      .map((s) => ({ ...s }));
  }

  async getSessionById(sessionId: string): Promise<Session | undefined> {
    const s = this.sessions.get(sessionId);
    return s ? { ...s } : undefined;
  }

  async getSessionByInviteToken(token: string): Promise<Session | undefined> {
    for (const s of this.sessions.values()) {
      if (s.inviteToken === token) {
        return { ...s };
      }
    }
    return undefined;
  }

  async createSession(creatorId: string, input: CreateSessionInput): Promise<Session> {
    const session: Session = {
      id: genId("ses"),
      title: input.title,
      prompt: input.prompt,
      durationMinutes: input.durationMinutes,
      status: "scheduled",
      createdAt: nowIso(),
      createdBy: creatorId,
      inviteToken: `inv-${Math.random().toString(36).slice(2, 8)}`,
    };
    this.sessions.set(session.id, session);

    // Auto-add creator as interviewer participant if creator exists
    const creator = await this.getUserById(creatorId);
    if (creator) {
      await this.addOrUpdateParticipant({
        id: genId("par"),
        sessionId: session.id,
        userId: creator.id,
        displayName: creator.displayName,
        role: "interviewer",
        color: creator.color,
        online: true,
        cursor: null,
      });
      await this.createAudit(session.id, creator.displayName, "session.created", session.title);
    }

    return { ...session };
  }

  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    session.status = status;
    return { ...session };
  }

  // Participants
  async getParticipants(sessionId: string): Promise<Participant[]> {
    return this.participants
      .filter((p) => p.sessionId === sessionId)
      .map((p) => ({ ...p }));
  }

  async getParticipant(sessionId: string, userId: string): Promise<Participant | undefined> {
    const p = this.participants.find((x) => x.sessionId === sessionId && x.userId === userId);
    return p ? { ...p } : undefined;
  }

  async addOrUpdateParticipant(participant: Participant): Promise<Participant> {
    const idx = this.participants.findIndex(
      (p) => p.sessionId === participant.sessionId && p.userId === participant.userId,
    );
    if (idx >= 0) {
      this.participants[idx] = { ...this.participants[idx], ...participant };
      return { ...this.participants[idx] };
    }
    this.participants.push({ ...participant });
    return { ...participant };
  }

  // Board
  async getBoard(sessionId: string): Promise<SessionBoard | undefined> {
    const session = await this.getSessionById(sessionId);
    if (!session) return undefined;

    return {
      session,
      participants: await this.getParticipants(sessionId),
      nodes: await this.listNodes(sessionId),
      edges: await this.listEdges(sessionId),
      messages: await this.listMessages(sessionId),
      audit: await this.listAudit(sessionId),
      snapshots: await this.listSnapshots(sessionId),
    };
  }

  // Canvas Nodes
  async listNodes(sessionId: string): Promise<CanvasNode[]> {
    return this.nodes.filter((n) => n.sessionId === sessionId).map((n) => ({ ...n }));
  }

  async getNode(sessionId: string, nodeId: string): Promise<CanvasNode | undefined> {
    const n = this.nodes.find((x) => x.sessionId === sessionId && x.id === nodeId);
    return n ? { ...n } : undefined;
  }

  async createNode(
    sessionId: string,
    node: Omit<CanvasNode, "id" | "sessionId" | "version">,
  ): Promise<CanvasNode> {
    const created: CanvasNode = {
      ...node,
      id: genId("nd"),
      sessionId,
      version: 1,
    };
    this.nodes.push(created);
    return { ...created };
  }

  async updateNode(
    sessionId: string,
    nodeId: string,
    patch: Partial<CanvasNode>,
  ): Promise<CanvasNode | undefined> {
    const node = this.nodes.find((n) => n.sessionId === sessionId && n.id === nodeId);
    if (!node) return undefined;

    Object.assign(node, patch, {
      id: node.id,
      sessionId: node.sessionId,
      version: node.version + 1,
    });
    return { ...node };
  }

  async deleteNode(sessionId: string, nodeId: string): Promise<boolean> {
    const initialLen = this.nodes.length;
    this.nodes = this.nodes.filter((n) => !(n.sessionId === sessionId && n.id === nodeId));
    if (this.nodes.length === initialLen) return false;

    // Cascade delete connected edges
    this.edges = this.edges.filter(
      (e) => !(e.sessionId === sessionId && (e.fromNodeId === nodeId || e.toNodeId === nodeId)),
    );
    return true;
  }

  // Canvas Edges
  async listEdges(sessionId: string): Promise<CanvasEdge[]> {
    return this.edges.filter((e) => e.sessionId === sessionId).map((e) => ({ ...e }));
  }

  async createEdge(
    sessionId: string,
    edge: Omit<CanvasEdge, "id" | "sessionId">,
  ): Promise<CanvasEdge> {
    const existing = this.edges.find(
      (e) =>
        e.sessionId === sessionId &&
        e.fromNodeId === edge.fromNodeId &&
        e.toNodeId === edge.toNodeId,
    );
    if (existing) return { ...existing };

    const created: CanvasEdge = {
      ...edge,
      id: genId("eg"),
      sessionId,
    };
    this.edges.push(created);
    return { ...created };
  }

  async deleteEdge(sessionId: string, edgeId: string): Promise<boolean> {
    const initialLen = this.edges.length;
    this.edges = this.edges.filter((e) => !(e.sessionId === sessionId && e.id === edgeId));
    return this.edges.length < initialLen;
  }

  // Chat
  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.messages
      .filter((m) => m.sessionId === sessionId)
      .map((m) => ({ ...m }));
  }

  async createMessage(
    sessionId: string,
    authorId: string,
    authorName: string,
    body: string,
  ): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: genId("msg"),
      sessionId,
      authorId,
      authorName,
      body,
      createdAt: nowIso(),
    };
    this.messages.push(message);
    return { ...message };
  }

  // Audit
  async listAudit(sessionId: string): Promise<AuditEntry[]> {
    return this.audit
      .filter((a) => a.sessionId === sessionId)
      .slice()
      .reverse()
      .map((a) => ({ ...a }));
  }

  async createAudit(
    sessionId: string,
    actorName: string,
    action: string,
    detail: string,
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: genId("aud"),
      sessionId,
      actorName,
      action,
      detail,
      createdAt: nowIso(),
    };
    this.audit.push(entry);
    return { ...entry };
  }

  // Snapshots
  async listSnapshots(sessionId: string): Promise<Snapshot[]> {
    return this.snapshots
      .filter((s) => s.sessionId === sessionId)
      .map((s) => ({
        ...s,
        nodes: s.nodes.map((n) => ({ ...n })),
        edges: s.edges.map((e) => ({ ...e })),
      }));
  }

  async getSnapshot(sessionId: string, snapshotId: string): Promise<Snapshot | undefined> {
    const s = this.snapshots.find((x) => x.sessionId === sessionId && x.id === snapshotId);
    if (!s) return undefined;
    return {
      ...s,
      nodes: s.nodes.map((n) => ({ ...n })),
      edges: s.edges.map((e) => ({ ...e })),
    };
  }

  async createSnapshot(sessionId: string, label: string): Promise<Snapshot> {
    const currentNodes = await this.listNodes(sessionId);
    const currentEdges = await this.listEdges(sessionId);

    const snapshot: Snapshot = {
      id: genId("snp"),
      sessionId,
      label,
      createdAt: nowIso(),
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: JSON.parse(JSON.stringify(currentEdges)),
    };
    this.snapshots.push(snapshot);
    return { ...snapshot };
  }

  async restoreSnapshot(sessionId: string, snapshotId: string): Promise<SessionBoard | undefined> {
    const snapshot = await this.getSnapshot(sessionId, snapshotId);
    if (!snapshot) return undefined;

    // Replace current nodes and edges with snapshot state
    this.nodes = this.nodes
      .filter((n) => n.sessionId !== sessionId)
      .concat(JSON.parse(JSON.stringify(snapshot.nodes)));

    this.edges = this.edges
      .filter((e) => e.sessionId !== sessionId)
      .concat(JSON.parse(JSON.stringify(snapshot.edges)));

    return this.getBoard(sessionId);
  }
}
