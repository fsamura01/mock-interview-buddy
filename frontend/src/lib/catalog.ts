import type { NodeKind } from "@/services/types";

export interface CatalogItem {
  kind: NodeKind;
  label: string;
  group: string;
  hint: string;
}

export const CATALOG: CatalogItem[] = [
  { kind: "client", label: "Client App", group: "Edge", hint: "Web or mobile entry point" },
  { kind: "cdn", label: "CDN", group: "Edge", hint: "Static asset distribution" },
  { kind: "gateway", label: "API Gateway", group: "Edge", hint: "Routing, authn, rate limits" },
  { kind: "service", label: "Service", group: "Compute", hint: "Stateless application service" },
  { kind: "worker", label: "Worker", group: "Compute", hint: "Background job processor" },
  { kind: "queue", label: "Queue", group: "Messaging", hint: "Async decoupling buffer" },
  { kind: "cache", label: "Cache", group: "Data", hint: "Low latency read layer" },
  { kind: "database", label: "Database", group: "Data", hint: "Durable primary store" },
  { kind: "storage", label: "Object Store", group: "Data", hint: "Blobs, media, backups" },
  { kind: "external", label: "3rd Party", group: "External", hint: "Vendor dependency" },
];

export const KIND_ACCENT: Record<NodeKind, string> = {
  client: "var(--node-edge)",
  cdn: "var(--node-edge)",
  gateway: "var(--node-edge)",
  service: "var(--node-compute)",
  worker: "var(--node-compute)",
  queue: "var(--node-messaging)",
  cache: "var(--node-data)",
  database: "var(--node-data)",
  storage: "var(--node-data)",
  external: "var(--node-external)",
};
