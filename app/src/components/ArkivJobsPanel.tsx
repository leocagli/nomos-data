import type { ArkivJobPreview } from "@/lib/arkiv";

function shortenWallet(address: string | null): string {
  if (!address) return "No wallet tagged";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ArkivJobsPanel({ jobs }: { jobs: ArkivJobPreview[] }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h2
          style={{
            fontSize: "1.0625rem",
            fontWeight: 600,
            color: "var(--text)",
            margin: 0,
          }}
        >
          Arkiv jobs
        </h2>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
            lineHeight: 1.55,
            margin: "6px 0 0",
          }}
        >
          Recent jobs fetched back from Arkiv using the project namespace plus
          the trusted creator wallet.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "20px",
            color: "var(--text-dim)",
            fontSize: "0.875rem",
          }}
        >
          No Arkiv jobs found yet. Run the orchestrator after configuring
          `ARKIV_PRIVATE_KEY` to populate this feed from Braga.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <a
              key={job.entityKey}
              href={job.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="card"
              style={{
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--accent)",
                    }}
                  >
                    {job.teamName ?? "Open pool job"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {job.runId}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "var(--tier-haiku-bg)",
                    color: "var(--tier-haiku)",
                    border: "1px solid rgba(5,150,105,0.16)",
                  }}
                >
                  {job.savedPct.toFixed(1)}% saved
                </span>
              </div>

              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {job.goal.length > 140 ? `${job.goal.slice(0, 140)}...` : job.goal}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="card"
                  style={{ padding: "10px 12px", background: "var(--bg-elev2)" }}
                >
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Requester
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      marginTop: "4px",
                    }}
                  >
                    {shortenWallet(job.requesterWallet)}
                  </div>
                </div>
                <div
                  className="card"
                  style={{ padding: "10px 12px", background: "var(--bg-elev2)" }}
                >
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Creator
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      fontFamily: "monospace",
                      marginTop: "4px",
                    }}
                  >
                    {shortenWallet(job.creator)}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
