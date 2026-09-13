import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Boxes, Clock, Users } from "lucide-react";
import { api } from "@/services/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sessions · Whiteboarder Interview Studio" },
      {
        name: "description",
        content:
          "Run collaborative system design interviews on a shared architecture canvas with presence, chat and audit history.",
      },
      { property: "og:title", content: "Sessions · Whiteboarder Interview Studio" },
      {
        property: "og:description",
        content: "Create interview sessions and collaborate on a live architecture canvas.",
      },
    ],
  }),
  component: Dashboard,
});

const statusStyle: Record<string, string> = {
  active: "text-node-messaging border-node-messaging/40",
  scheduled: "text-primary border-primary/40",
  paused: "text-accent border-accent/40",
  ended: "text-muted-foreground border-border",
};

function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api.listSessions() });
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.getCurrentUser() });

  const create = useMutation({
    mutationFn: () => api.createSession({ title, prompt, durationMinutes: 60 }),
    onSuccess: async (session) => {
      setTitle("");
      setPrompt("");
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      router.navigate({ to: "/session/$sessionId", params: { sessionId: session.id } });
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-14">
      <header className="mb-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Interview Studio
        </p>
        <h1 className="mt-3 text-4xl font-bold md:text-5xl">
          Whiteboard system design, together.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Shared architecture canvas, live cursors, session chat and a full audit trail.
          {me.data ? ` Signed in as ${me.data.displayName} (${me.data.role}).` : ""}
        </p>
      </header>

      <section className="panel mb-10 p-6">
        <h2 className="text-lg font-semibold">New session</h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            create.mutate();
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title"
            aria-label="Session title"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Interview prompt"
            aria-label="Interview prompt"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Create"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Your sessions</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {(sessions.data ?? []).map((s) => (
            <li key={s.id} className="panel p-5 transition hover:border-primary/60">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusStyle[s.status]}`}
                >
                  {s.status}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.prompt}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {s.durationMinutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {s.inviteToken}
                </span>
              </div>
              <Link
                to="/session/$sessionId"
                params={{ sessionId: s.id }}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                Open board <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
          {sessions.isLoading ? (
            <li className="panel flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Boxes className="h-4 w-4" /> Loading sessions…
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
