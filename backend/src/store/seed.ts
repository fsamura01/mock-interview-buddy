import type {
  AuditEntry,
  CanvasEdge,
  CanvasNode,
  ChatMessage,
  Participant,
  Session,
  Snapshot,
  User,
} from "../models/domain.js";
import { hashPassword } from "../auth/password.js";

export interface SeedData {
  users: User[];
  sessions: Session[];
  participants: Participant[];
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  messages: ChatMessage[];
  audit: AuditEntry[];
  snapshots: Snapshot[];
}

export async function createSeedData(): Promise<SeedData> {
  const defaultPasswordHash = await hashPassword("password123");
  const nowIso = new Date().toISOString();

  const users: User[] = [
    {
      id: "u_interviewer",
      displayName: "Ada Mensah",
      email: "ada@interviews.dev",
      role: "interviewer",
      color: "#f0b429",
      passwordHash: defaultPasswordHash,
    },
    {
      id: "u_candidate",
      displayName: "Noah Chen",
      email: "noah@candidate.dev",
      role: "candidate",
      color: "#2dd4bf",
      passwordHash: defaultPasswordHash,
    },
    {
      id: "u_obs",
      displayName: "Priya Raman",
      email: "priya@observer.dev",
      role: "observer",
      color: "#94a3b8",
      passwordHash: defaultPasswordHash,
    },
    {
      id: "u_admin",
      displayName: "System Admin",
      email: "admin@interviews.dev",
      role: "admin",
      color: "#ec4899",
      passwordHash: defaultPasswordHash,
    },
  ];

  const sessionId = "ses_demo";

  const sessions: Session[] = [
    {
      id: sessionId,
      title: "Design a URL shortener",
      prompt: "Design a highly available URL shortening service handling 10k writes/s and 1M reads/s with analytics.",
      status: "active",
      createdAt: nowIso,
      createdBy: "u_interviewer",
      inviteToken: "inv-7f3a91",
      durationMinutes: 60,
    },
    {
      id: "ses_feed",
      title: "Design a news feed",
      prompt: "Design a personalized feed for 50M daily active users with fan-out on write.",
      status: "scheduled",
      createdAt: nowIso,
      createdBy: "u_interviewer",
      inviteToken: "inv-22c108",
      durationMinutes: 45,
    },
  ];

  const participants: Participant[] = [
    {
      id: "p1",
      sessionId,
      userId: "u_interviewer",
      displayName: "Ada Mensah",
      role: "interviewer",
      color: "#f0b429",
      online: true,
      cursor: null,
    },
    {
      id: "p2",
      sessionId,
      userId: "u_candidate",
      displayName: "Noah Chen",
      role: "candidate",
      color: "#2dd4bf",
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
  ];

  const clientNode: CanvasNode = {
    id: "nd_client",
    sessionId,
    kind: "client",
    label: "Web Client",
    notes: "",
    x: 80,
    y: 120,
    width: 176,
    height: 84,
    version: 1,
  };

  const gatewayNode: CanvasNode = {
    id: "nd_gateway",
    sessionId,
    kind: "gateway",
    label: "API Gateway",
    notes: "",
    x: 330,
    y: 120,
    width: 176,
    height: 84,
    version: 1,
  };

  const serviceNode: CanvasNode = {
    id: "nd_service",
    sessionId,
    kind: "service",
    label: "Shortener Service",
    notes: "",
    x: 580,
    y: 60,
    width: 176,
    height: 84,
    version: 1,
  };

  const cacheNode: CanvasNode = {
    id: "nd_cache",
    sessionId,
    kind: "cache",
    label: "Redis Cache",
    notes: "",
    x: 580,
    y: 240,
    width: 176,
    height: 84,
    version: 1,
  };

  const dbNode: CanvasNode = {
    id: "nd_database",
    sessionId,
    kind: "database",
    label: "Postgres",
    notes: "",
    x: 840,
    y: 150,
    width: 176,
    height: 84,
    version: 1,
  };

  const nodes: CanvasNode[] = [clientNode, gatewayNode, serviceNode, cacheNode, dbNode];

  const edges: CanvasEdge[] = [
    {
      id: "eg_1",
      sessionId,
      fromNodeId: clientNode.id,
      toNodeId: gatewayNode.id,
      label: "HTTPS",
      protocol: "http",
    },
    {
      id: "eg_2",
      sessionId,
      fromNodeId: gatewayNode.id,
      toNodeId: serviceNode.id,
      label: "REST",
      protocol: "http",
    },
    {
      id: "eg_3",
      sessionId,
      fromNodeId: serviceNode.id,
      toNodeId: cacheNode.id,
      label: "lookup",
      protocol: "async",
    },
    {
      id: "eg_4",
      sessionId,
      fromNodeId: serviceNode.id,
      toNodeId: dbNode.id,
      label: "persist",
      protocol: "sql",
    },
  ];

  const messages: ChatMessage[] = [
    {
      id: "msg_1",
      sessionId,
      authorId: "u_candidate",
      authorName: "Noah Chen",
      body: "Starting with read-heavy assumptions — 100:1 read to write ratio.",
      createdAt: nowIso,
    },
  ];

  const audit: AuditEntry[] = [
    {
      id: "aud_1",
      sessionId,
      actorName: "Ada Mensah",
      action: "session.started",
      detail: "Session opened for collaboration",
      createdAt: nowIso,
    },
    {
      id: "aud_2",
      sessionId,
      actorName: "Ada Mensah",
      action: "node.created",
      detail: "gateway · API Gateway",
      createdAt: nowIso,
    },
  ];

  const snapshots: Snapshot[] = [];

  return {
    users,
    sessions,
    participants,
    nodes,
    edges,
    messages,
    audit,
    snapshots,
  };
}
