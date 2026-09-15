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

export interface IStore {
  // Users & Auth
  getUserById(userId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: User): Promise<User>;

  // Sessions
  listSessions(userId?: string): Promise<Session[]>;
  getSessionById(sessionId: string): Promise<Session | undefined>;
  getSessionByInviteToken(token: string): Promise<Session | undefined>;
  createSession(creatorId: string, input: CreateSessionInput): Promise<Session>;
  updateSessionStatus(sessionId: string, status: SessionStatus): Promise<Session | undefined>;

  // Participants
  getParticipants(sessionId: string): Promise<Participant[]>;
  getParticipant(sessionId: string, userId: string): Promise<Participant | undefined>;
  addOrUpdateParticipant(participant: Participant): Promise<Participant>;

  // Board
  getBoard(sessionId: string): Promise<SessionBoard | undefined>;

  // Canvas Nodes
  listNodes(sessionId: string): Promise<CanvasNode[]>;
  getNode(sessionId: string, nodeId: string): Promise<CanvasNode | undefined>;
  createNode(sessionId: string, node: Omit<CanvasNode, "id" | "sessionId" | "version">): Promise<CanvasNode>;
  updateNode(sessionId: string, nodeId: string, patch: Partial<CanvasNode>): Promise<CanvasNode | undefined>;
  deleteNode(sessionId: string, nodeId: string): Promise<boolean>;

  // Canvas Edges
  listEdges(sessionId: string): Promise<CanvasEdge[]>;
  createEdge(sessionId: string, edge: Omit<CanvasEdge, "id" | "sessionId">): Promise<CanvasEdge>;
  deleteEdge(sessionId: string, edgeId: string): Promise<boolean>;

  // Chat
  listMessages(sessionId: string): Promise<ChatMessage[]>;
  createMessage(sessionId: string, authorId: string, authorName: string, body: string): Promise<ChatMessage>;

  // Audit
  listAudit(sessionId: string): Promise<AuditEntry[]>;
  createAudit(sessionId: string, actorName: string, action: string, detail: string): Promise<AuditEntry>;

  // Snapshots
  listSnapshots(sessionId: string): Promise<Snapshot[]>;
  getSnapshot(sessionId: string, snapshotId: string): Promise<Snapshot | undefined>;
  createSnapshot(sessionId: string, label: string): Promise<Snapshot>;
  restoreSnapshot(sessionId: string, snapshotId: string): Promise<SessionBoard | undefined>;

  // Test helpers / resetting
  reset(): Promise<void>;
}
