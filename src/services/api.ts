// Single services layer. Every backend call in the app goes through this
// interface, so swapping the mock for a real API means changing one line below.

import type {
  AuditEntry,
  CanvasEdge,
  CanvasNode,
  ChatMessage,
  CreateSessionInput,
  Session,
  SessionBoard,
  Snapshot,
  User,
} from "./types";
import { mockApi } from "./mock/mock-api";

export interface PlatformApi {
  getCurrentUser(): Promise<User>;

  listSessions(): Promise<Session[]>;
  createSession(input: CreateSessionInput): Promise<Session>;
  getBoard(sessionId: string): Promise<SessionBoard>;
  setSessionStatus(sessionId: string, status: Session["status"]): Promise<Session>;

  createNode(sessionId: string, node: Omit<CanvasNode, "id" | "sessionId" | "version">): Promise<CanvasNode>;
  updateNode(sessionId: string, nodeId: string, patch: Partial<CanvasNode>): Promise<CanvasNode>;
  deleteNode(sessionId: string, nodeId: string): Promise<void>;

  createEdge(sessionId: string, edge: Omit<CanvasEdge, "id" | "sessionId">): Promise<CanvasEdge>;
  deleteEdge(sessionId: string, edgeId: string): Promise<void>;

  sendMessage(sessionId: string, body: string): Promise<ChatMessage>;
  listAudit(sessionId: string): Promise<AuditEntry[]>;
  saveSnapshot(sessionId: string, label: string): Promise<Snapshot>;
  restoreSnapshot(sessionId: string, snapshotId: string): Promise<SessionBoard>;

  /** Subscribe to live board changes (presence, cursors, remote edits). */
  subscribe(sessionId: string, onChange: (board: SessionBoard) => void): () => void;
}

export const api: PlatformApi = mockApi;
