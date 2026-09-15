import { z } from "zod";

export const NodeKindSchema = z.enum([
  "client",
  "gateway",
  "service",
  "database",
  "cache",
  "queue",
  "storage",
  "cdn",
  "worker",
  "external",
]);

export const EdgeProtocolSchema = z.enum([
  "http",
  "grpc",
  "async",
  "sql",
  "stream",
]);

export const SessionStatusSchema = z.enum([
  "scheduled",
  "active",
  "paused",
  "ended",
]);

export const RoleSchema = z.enum([
  "interviewer",
  "candidate",
  "observer",
  "admin",
]);

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const JoinSessionSchema = z.object({
  token: z.string().min(1, "Invite token is required"),
  displayName: z.string().min(1, "Display name is required"),
});

export const CreateSessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  prompt: z.string().default(""),
  durationMinutes: z.number().int().positive().default(60),
});

export const UpdateSessionStatusSchema = z.object({
  status: SessionStatusSchema,
});

export const CreateNodeSchema = z.object({
  kind: NodeKindSchema,
  label: z.string().min(1, "Label is required"),
  notes: z.string().default(""),
  x: z.number(),
  y: z.number(),
  width: z.number().default(176),
  height: z.number().default(84),
});

export const UpdateNodeSchema = z.object({
  kind: NodeKindSchema.optional(),
  label: z.string().min(1).optional(),
  notes: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const CreateEdgeSchema = z.object({
  fromNodeId: z.string().min(1, "fromNodeId is required"),
  toNodeId: z.string().min(1, "toNodeId is required"),
  label: z.string().default(""),
  protocol: EdgeProtocolSchema,
});

export const SendMessageSchema = z.object({
  body: z.string().min(1, "Message body cannot be empty"),
});

export const SaveSnapshotSchema = z.object({
  label: z.string().min(1, "Snapshot label is required"),
});
