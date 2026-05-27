import Link from "next/link";
import type { OrchestrationRun } from "@/lib/types";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function RecentRunsPanel({ runs }: { runs: OrchestrationRun[] }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "1.0625rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
            Recent runs
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "6px 0 0" }}>
            A lightweight activity feed showing whether each routed run produced Arkiv-backed receipts.
          </p>
        </div>
        <Link href="/orchestrate" style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none" }}>
          Start a new run →
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="card" style={{ padding: "20px", color: "var(--text-dim)", fontSize: "0.875rem" }}>
          No runs yet in this server session. Launch a run and Nomos will start recording Arkiv-linked activity here.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {runs.map((run) => {
            const successCount = run.subtasks.filter((subtask) => subtask.status === "done").length;
            const errorCount = run.subtasks.filter((subtask) => subtask.status === "error").length;
            const preview = run.goal.length > 120 ? `${run.goal.slice(0, 120)}…` : run.goal;
            return (
              <div key={run.id} className="card" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)" }}>
                      {run.team_name ?? "Open pool run"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", fontFamily: "monospace" }}>
                      {relativeTime(run.created_at)}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      padding: "3px 8px",
                      borderRadius: "999px",
                      background: run.status === "done" ? "var(--tier-haiku-bg)" : "rgba(220,38,38,0.08)",
                      color: run.status === "done" ? "var(--tier-haiku)" : "#DC2626",
                      border: "1px solid rgba(5,150,105,0.16)",
                    }}
                  >
                    {run.status}
                  </span>
                </div>

                <p style={{ fontSize: "0.875rem", color: "var(--text)", lineHeight: 1.6, margin: 0 }}>
                  {preview}
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="card" style={{ padding: "10px 12px", background: "var(--bg-elev2)" }}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tasks</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "monospace", marginTop: "4px" }}>{run.subtasks.length}</div>
                  </div>
                  <div className="card" style={{ padding: "10px 12px", background: "var(--bg-elev2)" }}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Completed</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "monospace", marginTop: "4px" }}>{successCount}</div>
                  </div>
                  <div className="card" style={{ padding: "10px 12px", background: "var(--bg-elev2)" }}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Saved</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, fontFamily: "monospace", marginTop: "4px", color: "var(--savings)" }}>{run.saved_pct.toFixed(1)}%</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "0.75rem", color: errorCount > 0 ? "#DC2626" : "var(--text-muted)" }}>
                    {errorCount > 0
                      ? `${errorCount} task${errorCount !== 1 ? "s" : ""} failed`
                      : run.arkiv?.status === "stored"
                        ? "All tasks completed and Arkiv receipts were stored"
                        : "All streamed tasks completed cleanly"}
                  </div>
                  <Link
                    href={run.team_id ? `/orchestrate?team=${run.team_id}` : "/orchestrate"}
                    style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none" }}
                  >
                    Run again →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
