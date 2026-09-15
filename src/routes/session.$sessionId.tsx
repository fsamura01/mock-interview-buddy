import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { CATALOG, KIND_ACCENT } from "@/lib/catalog";
import { BoardCanvas } from "@/components/session/board-canvas";
import { AuditPanel, ChatPanel, ParticipantList, SnapshotPanel } from "@/components/session/side-panels";
import type { NodeKind, SessionBoard, SessionStatus } from "@/services/types";

export const Route = createFileRoute("/session/$sessionId")({
  head: () => ({
    meta: [
      { title: "Live board · Whiteboarder Interview Studio" },
      {
        name: "description",
        content:
          "Collaborative architecture canvas with live presence, component palette, chat and audit history.",
      },
      { property: "og:title", content: "Live board · Whiteboarder Interview Studio" },
      {
        property: "og:description",
        content: "Drag components, connect them and collaborate in real time.",
      },
    ],
  }),
  component: SessionBoardPage,
});

type Tab = "chat" | "audit" | "snapshots";

function SessionBoardPage() {
  const { sessionId } = Route.useParams();
  const [board, setBoard] = useState<SessionBoard | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getBoard(sessionId)
      .then((b) => alive && setBoard(b))
      .catch(() => alive && setError("This session could not be found."));
    const unsubscribe = api.subscribe(sessionId, (b) => alive && setBoard(b));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [sessionId]);

  const selected = board?.nodes.find((n) => n.id === selectedId) ?? null;
  const readOnly = board?.session.status === "ended";

  const addNode = useCallback(
    (kind: string, x: number, y: number) => {
      const item = CATALOG.find((c) => c.kind === kind);
      void api.createNode(sessionId, {
        kind: kind as NodeKind,
        label: item?.label ?? "Component",
        notes: "",
        x,
        y,
        width: 176,
        height: 84,
      });
    },
    [sessionId],
  );

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Session unavailable</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Link to="/" className="mt-4 inline-block text-primary">
            Back to sessions
          </Link>
        </div>
      </main>
    );
  }

  if (!board) {
    return (
      <main className="grid min-h-screen place-items-center text-muted-foreground">
        Loading board…
      </main>
    );
  }

  const setStatus = (status: SessionStatus) => {
    void api.setSessionStatus(sessionId, status);
    toast.success(`Session ${status}`);
  };

  return (
    <main className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link to="/" aria-label="Back to sessions" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{board.session.title}</h1>
          <p className="truncate text-xs text-muted-foreground">{board.session.prompt}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(
                `${typeof window !== "undefined" ? window.location.origin : ""}/session/${sessionId}?invite=${board.session.inviteToken}`,
              );
              toast.success("Invite link copied");
            }}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary"
          >
            <Copy className="h-3.5 w-3.5" /> Invite link
          </button>
          <button
            onClick={() => setStatus(board.session.status === "paused" ? "active" : "paused")}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary"
          >
            {board.session.status === "paused" ? (
              <>
                <Play className="h-3.5 w-3.5" /> Resume
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" /> Pause
              </>
            )}
          </button>
          <button
            onClick={() => setStatus("ended")}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Square className="h-3.5 w-3.5" /> End
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[200px_1fr_300px]">
        <aside className="panel hidden min-h-0 flex-col overflow-y-auto p-3 lg:flex">
          <h2 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Palette</h2>
          <ul className="space-y-1.5">
            {CATALOG.map((item) => (
              <li key={item.kind}>
                <div
                  draggable={!readOnly}
                  onDragStart={(e) => e.dataTransfer.setData("text/node-kind", item.kind)}
                  onDoubleClick={() => addNode(item.kind, 120, 120)}
                  title={item.hint}
                  className="cursor-grab rounded-md border border-border bg-surface-raised px-2.5 py-2 text-sm active:cursor-grabbing"
                >
                  <span
                    className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ backgroundColor: KIND_ACCENT[item.kind] }}
                  />
                  {item.label}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Drag onto the canvas, or double-click to drop one in.
          </p>
        </aside>

        <section className="panel min-h-0 overflow-hidden p-2">
          <BoardCanvas
            nodes={board.nodes}
            edges={board.edges}
            participants={board.participants.filter((p) => p.userId !== "u_interviewer")}
            selectedId={selectedId}
            readOnly={!!readOnly}
            onSelect={setSelectedId}
            onMove={(nodeId, x, y) => void api.updateNode(sessionId, nodeId, { x, y })}
            onConnect={(fromNodeId, toNodeId) =>
              void api.createEdge(sessionId, { fromNodeId, toNodeId, label: "", protocol: "http" })
            }
            onDelete={(nodeId) => {
              setSelectedId(null);
              void api.deleteNode(sessionId, nodeId);
            }}
            onDeleteEdge={(edgeId) => void api.deleteEdge(sessionId, edgeId)}
            onDropKind={addNode}
          />
        </section>

        <aside className="panel flex min-h-0 flex-col gap-4 p-3">
          <div>
            <h2 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              Participants
            </h2>
            <ParticipantList participants={board.participants} />
          </div>

          {selected ? (
            <div className="rounded-lg border border-border bg-surface-raised p-3">
              <h2 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                Component
              </h2>
              <input
                value={selected.label}
                onChange={(e) => void api.updateNode(sessionId, selected.id, { label: e.target.value })}
                aria-label="Component label"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring"
              />
              <textarea
                value={selected.notes}
                placeholder="Notes, capacity, trade-offs…"
                onChange={(e) => void api.updateNode(sessionId, selected.id, { notes: e.target.value })}
                aria-label="Component notes"
                className="mt-2 h-20 w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring"
              />
            </div>
          ) : null}

          <div className="flex gap-1 border-b border-border text-xs">
            {(["chat", "audit", "snapshots"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-2 py-1.5 capitalize ${
                  tab === t
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "chat" ? (
            <ChatPanel
              messages={board.messages}
              onSend={(body) => void api.sendMessage(sessionId, body)}
            />
          ) : null}
          {tab === "audit" ? <AuditPanel entries={board.audit} /> : null}
          {tab === "snapshots" ? (
            <SnapshotPanel
              snapshots={board.snapshots}
              onSave={() => {
                void api.saveSnapshot(sessionId, `Snapshot ${board.snapshots.length + 1}`);
                toast.success("Snapshot saved");
              }}
              onRestore={(snapshotId) => {
                void api.restoreSnapshot(sessionId, snapshotId);
                toast.success("Snapshot restored");
              }}
            />
          ) : null}
        </aside>
      </div>
    </main>
  );
}
