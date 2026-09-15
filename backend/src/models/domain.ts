// Domain models matching openapi.yaml and the frontend data contracts

export type Role = "interviewer" | "candidate" | "observer" | "admin";

export type SessionStatus = "scheduled" | "active" | "paused" | "ended";

export type NodeKind =
  | "client"
  | "gateway"
  | "service"
  | "database"
  | "cache"
  | "queue"
  | "storage"
  | "cdn"
  | "worker"
  | "external";

export type EdgeProtocol = "http" | "grpc" | "async" | "sql" | "stream";

export interface User {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  color: string;
  passwordHash?: string; // Stored securely internally, never returned in API responses
}

export interface Session {
  id: string;
  title: string;
  prompt: string;
  status: SessionStatus;
  createdAt: string;
  createdBy: string;
  inviteToken: string;
  durationMinutes: number;
}

export interface Participant {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  role: Role;
  color: string;
  online: boolean;
  cursor?: { x: number; y: number } | null;
}

export interface CanvasNode {
  id: string;
  sessionId: string;
  kind: NodeKind;
  label: string;
  notes: string;
  x: number;
  y: number;
  width: number;
  height: number;
  version: number;
}

export interface CanvasEdge {
  id: string;
  sessionId: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  protocol: EdgeProtocol;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  sessionId: string;
  actorName: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface Snapshot {
  id: string;
  sessionId: string;
  label: string;
  createdAt: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface SessionBoard {
  session: Session;
  participants: Participant[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  messages: ChatMessage[];
  audit: AuditEntry[];
  snapshots: Snapshot[];
}

export interface CreateSessionInput {
  title: string;
  prompt: string;
  durationMinutes: number;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: Role;
  displayName: string;
  sessionId?: string; // Present when token is scoped to a joined session
}
