import type { SubTask } from "@/lib/types";

function countByStatus(subtasks: SubTask[]) {
  return subtasks.reduce(
    (acc, subtask) => {
      acc[subtask.status] += 1;
      return acc;
    },
    {
      pending: 0,
      classifying: 0,
      routed: 0,
      working: 0,
      done: 0,
      error: 0,
    } as Record<SubTask["status"], number>,
  );
}

export function ExecutionStepper({
  subtasks,
  running,
  finished,
  arkivPhase,
}: {
  subtasks: SubTask[];
  running: boolean;
  finished: boolean;
  arkivPhase: "idle" | "queued" | "writing" | "stored" | "partial" | "skipped" | "failed";
}) {
  const counts = countByStatus(subtasks);
  const total = subtasks.length;
  const hasTasks = total > 0;
  const classified = counts.routed + counts.working + counts.done + counts.error;
  const assigned = subtasks.filter((subtask) => subtask.agent_id).length;
  const completed = counts.done + counts.error;
  const ledgerStarted = arkivPhase === "writing" || arkivPhase === "stored" || arkivPhase === "partial" || arkivPhase === "skipped" || arkivPhase === "failed";
  const ledgerDone = arkivPhase === "stored" || arkivPhase === "partial" || arkivPhase === "skipped" || arkivPhase === "failed";
  const ledgerDetail =
    arkivPhase === "writing"
      ? "Submitting the execution graph to Arkiv"
      : arkivPhase === "stored"
        ? "Ledger stored and queryable"
        : arkivPhase === "partial"
          ? "Some Arkiv entities were created before a later transaction failed"
        : arkivPhase === "skipped"
          ? "Arkiv write skipped until server wallet is configured"
          : arkivPhase === "failed"
            ? "Ledger write failed after execution"
            : finished
              ? "Waiting to persist receipts"
              : "Runs are signed server-side when execution finishes";

  const stages = [
    {
      label: "Decompose",
      detail: hasTasks ? `${total} tasks created` : "Waiting for a goal",
      state: hasTasks ? "done" : "current",
    },
    {
      label: "Classify",
      detail: hasTasks ? `${classified}/${total} tasks classified` : "Complexity scoring pending",
      state: !hasTasks ? "upcoming" : classified >= total ? "done" : running ? "current" : "upcoming",
    },
    {
      label: "Assign",
      detail: hasTasks ? `${assigned}/${total} specialists assigned` : "Team selection pending",
      state: !hasTasks ? "upcoming" : assigned >= total ? "done" : classified > 0 ? "current" : "upcoming",
    },
    {
      label: "Execute",
      detail: hasTasks ? `${completed}/${total} tasks completed` : "Outputs will stream here",
      state: !hasTasks ? "upcoming" : finished ? "done" : counts.working > 0 || completed > 0 ? "current" : "upcoming",
    },
    {
      label: "Ledger",
      detail: ledgerDetail,
      state: !hasTasks
        ? "upcoming"
        : ledgerDone
          ? "done"
          : ledgerStarted || finished
            ? "current"
            : "upcoming",
    },
  ] as const;

  return (
    <div className="card" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)" }}>
            Execution path
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-dim)", marginTop: "4px" }}>
            Make the routing story visible: decomposition, classification, assignment, execution, then Arkiv persistence.
          </div>
        </div>
        {hasTasks && (
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
            done {counts.done} · working {counts.working} · errors {counts.error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map((stage, index) => {
          const active = stage.state === "current";
          const done = stage.state === "done";
          return (
            <div
              key={stage.label}
              className="card"
              style={{
                padding: "14px",
                background: done
                  ? "var(--yerba-soft)"
                  : active
                    ? "var(--terere-soft)"
                    : "var(--bg-elev)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                <span
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "999px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    fontFamily: "Inter, sans-serif",
                    background: done ? "var(--yerba)" : active ? "var(--terere)" : "var(--cream-2)",
                    color: "var(--ink)",
                    border: "2px solid var(--ink)",
                  }}
                >
                  {index + 1}
                </span>
                <span
                  style={{
                    fontSize: "0.625rem",
                    color: "var(--ink)",
                    textTransform: "uppercase",
                    letterSpacing: "0.22em",
                    fontWeight: 600,
                    opacity: done || active ? 1 : 0.5,
                  }}
                >
                  {done ? "Done" : active ? "Live" : "Queued"}
                </span>
              </div>
              <div
                className="font-display"
                style={{ fontSize: "1rem", color: "var(--ink)", lineHeight: 1, letterSpacing: "0.005em" }}
              >
                {stage.label}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "8px", lineHeight: 1.55 }}>
                {stage.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}