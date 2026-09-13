import { useCallback, useRef, useState } from "react";
import { Link2, Trash2, X } from "lucide-react";
import { KIND_ACCENT } from "@/lib/catalog";
import type { CanvasEdge, CanvasNode, Participant } from "@/services/types";

interface Props {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  participants: Participant[];
  selectedId: string | null;
  readOnly: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onConnect: (fromId: string, toId: string) => void;
  onDelete: (id: string) => void;
  onDropKind: (kind: string, x: number, y: number) => void;
  onDeleteEdge: (id: string) => void;
}

function center(node: CanvasNode) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

export function BoardCanvas({
  nodes,
  edges,
  participants,
  selectedId,
  readOnly,
  onSelect,
  onMove,
  onConnect,
  onDelete,
  onDropKind,
  onDeleteEdge,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }, []);

  const handlePointerDown = (event: React.PointerEvent, node: CanvasNode) => {
    if (readOnly) return;
    event.stopPropagation();
    onSelect(node.id);
    if (linkFrom) {
      if (linkFrom !== node.id) onConnect(linkFrom, node.id);
      setLinkFrom(null);
      return;
    }
    const point = toLocal(event.clientX, event.clientY);
    drag.current = { id: node.id, dx: point.x - node.x, dy: point.y - node.y };
    (event.target as Element).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    const point = toLocal(event.clientX, event.clientY);
    onMove(
      drag.current.id,
      Math.round(Math.max(0, point.x - drag.current.dx) / 8) * 8,
      Math.round(Math.max(0, point.y - drag.current.dy) / 8) * 8,
    );
  };

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div
      ref={ref}
      className="canvas-grid relative h-full w-full overflow-hidden rounded-xl bg-background"
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClick={() => {
        onSelect(null);
        setLinkFrom(null);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData("text/node-kind");
        if (!kind || readOnly) return;
        const point = toLocal(e.clientX, e.clientY);
        onDropKind(kind, Math.max(0, point.x - 88), Math.max(0, point.y - 42));
      }}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="var(--color-muted-foreground)" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const from = nodes.find((n) => n.id === edge.fromNodeId);
          const to = nodes.find((n) => n.id === edge.toNodeId);
          if (!from || !to) return null;
          const a = center(from);
          const b = center(to);
          return (
            <g key={edge.id}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--color-muted-foreground)"
                strokeWidth={1.5}
                strokeDasharray={edge.protocol === "async" ? "6 5" : undefined}
                markerEnd="url(#arrow)"
              />
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] uppercase tracking-wider"
              >
                {edge.label || edge.protocol}
              </text>
            </g>
          );
        })}
      </svg>

      {edges.map((edge) => {
        const from = nodes.find((n) => n.id === edge.fromNodeId);
        const to = nodes.find((n) => n.id === edge.toNodeId);
        if (!from || !to || readOnly) return null;
        const a = center(from);
        const b = center(to);
        return (
          <button
            key={`del-${edge.id}`}
            aria-label="Remove connection"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteEdge(edge.id);
            }}
            className="absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted-foreground opacity-0 transition hover:text-destructive hover:opacity-100 focus:opacity-100"
            style={{ left: (a.x + b.x) / 2, top: (a.y + b.y) / 2 + 10 }}
          >
            <X className="h-3 w-3" />
          </button>
        );
      })}

      {nodes.map((node) => {
        const selected = node.id === selectedId;
        const accent = KIND_ACCENT[node.kind];
        return (
          <div
            key={node.id}
            onPointerDown={(e) => handlePointerDown(e, node)}
            className={`absolute select-none rounded-lg border bg-surface-raised px-3 py-2 shadow-node transition-shadow ${
              selected ? "border-primary ring-2 ring-primary/40" : "border-border"
            } ${readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${
              linkFrom && linkFrom !== node.id ? "ring-2 ring-accent/60" : ""
            }`}
            style={{ left: node.x, top: node.y, width: node.width, minHeight: node.height }}
          >
            <span
              className="mb-1 block h-1 w-8 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
            <p className="font-display text-sm font-semibold leading-tight">{node.label}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {node.kind}
            </p>
            {node.notes ? (
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{node.notes}</p>
            ) : null}

            {selected && !readOnly ? (
              <div className="absolute -top-3 right-2 flex gap-1">
                <button
                  aria-label="Connect from this component"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLinkFrom(linkFrom === node.id ? null : node.id);
                  }}
                  className={`grid h-6 w-6 place-items-center rounded-md border border-border bg-surface ${
                    linkFrom === node.id ? "text-accent" : "text-muted-foreground"
                  } hover:text-accent`}
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label="Delete component"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(node.id);
                  }}
                  className="grid h-6 w-6 place-items-center rounded-md border border-border bg-surface text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      {participants
        .filter((p) => p.online && p.cursor)
        .map((p) => (
          <div
            key={p.id}
            className="pointer-events-none absolute z-20 flex items-center gap-1 transition-all duration-1000 ease-linear"
            style={{ left: p.cursor!.x, top: p.cursor!.y }}
          >
            <span
              className="h-2.5 w-2.5 rotate-45 rounded-[2px]"
              style={{ backgroundColor: p.color }}
            />
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-background"
              style={{ backgroundColor: p.color }}
            >
              {p.displayName}
            </span>
          </div>
        ))}

      {linkFrom ? (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          Pick a target component to connect
        </p>
      ) : null}
    </div>
  );
}
