import { useState } from "react";
import { Send } from "lucide-react";
import type { AuditEntry, ChatMessage, Participant, Snapshot } from "@/services/types";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function ParticipantList({ participants }: { participants: Participant[] }) {
  return (
    <ul className="space-y-2">
      {participants.map((p) => (
        <li key={p.id} className="flex items-center gap-2 text-sm">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-background"
            style={{ backgroundColor: p.color }}
          >
            {p.displayName.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate">{p.displayName}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {p.role}
          </span>
          <span
            className={`h-2 w-2 rounded-full ${p.online ? "bg-node-messaging" : "bg-muted-foreground/40"}`}
            title={p.online ? "Online" : "Offline"}
          />
        </li>
      ))}
    </ul>
  );
}

export function ChatPanel({
  messages,
  onSend,
}: {
  messages: ChatMessage[];
  onSend: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <p className="text-[11px] text-muted-foreground">
              {m.authorName} · {time(m.createdAt)}
            </p>
            <p className="rounded-lg rounded-tl-none bg-surface-raised px-3 py-2">{m.body}</p>
          </div>
        ))}
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : null}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onSend(draft.trim());
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the room"
          aria-label="Message"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="grid w-10 place-items-center rounded-md bg-primary text-primary-foreground transition hover:opacity-90"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export function AuditPanel({ entries }: { entries: AuditEntry[] }) {
  return (
    <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
      {entries.map((a) => (
        <li key={a.id} className="border-l-2 border-border pl-3">
          <p className="font-mono text-[11px] text-accent">{a.action}</p>
          <p className="text-muted-foreground">{a.detail}</p>
          <p className="text-[10px] text-muted-foreground/70">
            {a.actorName} · {time(a.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SnapshotPanel({
  snapshots,
  onSave,
  onRestore,
}: {
  snapshots: Snapshot[];
  onSave: () => void;
  onRestore: (id: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <button
        onClick={onSave}
        className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium transition hover:border-primary"
      >
        Save snapshot
      </button>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
        {snapshots.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <button
              onClick={() => onRestore(s.id)}
              className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:text-primary"
            >
              Restore
            </button>
          </li>
        ))}
        {snapshots.length === 0 ? (
          <li className="text-muted-foreground">No snapshots saved yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
