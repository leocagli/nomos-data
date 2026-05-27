"use client";

import { useEffect, useState } from "react";
import { ethToUsdc } from "@/lib/pricing";
import type { ArkivRunQueryData, ArkivRunReceipt } from "@/lib/types";

function shortKey(value: string): string {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function ReceiptLink({
  label,
  href,
  value,
}: {
  label: string;
  href: string;
  value: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        textDecoration: "none",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "12px 14px",
        borderRadius: "14px",
        border: "1.5px solid var(--ink)",
        background: "var(--bg-elev)",
      }}
    >
      <span
        style={{
          fontSize: "0.625rem",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "var(--text-muted)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace" }}>
        {shortKey(value)}
      </span>
    </a>
  );
}

export function ArkivReceiptPanel({ receipt }: { receipt: ArkivRunReceipt }) {
  const [queryData, setQueryData] = useState<ArkivRunQueryData | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [loadingQueries, setLoadingQueries] = useState(false);

  useEffect(() => {
    if (receipt.status !== "stored" || !receipt.runId) {
      setQueryData(null);
      setQueryError(null);
      setLoadingQueries(false);
      return;
    }

    const controller = new AbortController();
    const search = new URLSearchParams();
    if (receipt.requesterWallet) {
      search.set("requesterWallet", receipt.requesterWallet);
    }

    setLoadingQueries(true);
    setQueryError(null);

    fetch(`/api/arkiv/runs/${encodeURIComponent(receipt.runId)}?${search.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success?: boolean;
          data?: ArkivRunQueryData;
          error?: { message?: string };
        };

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.message ?? "Unable to load Arkiv queries.");
        }

        setQueryData(payload.data);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "AbortError") return;
        setQueryError(
          error instanceof Error ? error.message : "Unable to load Arkiv queries.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingQueries(false);
        }
      });

    return () => controller.abort();
  }, [receipt.requesterWallet, receipt.runId, receipt.status]);

  const tone =
    receipt.status === "stored"
      ? "var(--yerba-soft)"
      : receipt.status === "partial"
        ? "var(--terere-soft)"
      : receipt.status === "failed"
        ? "var(--pink-soft)"
        : "var(--bg-elev)";

  return (
    <div
      className="card"
      style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", background: tone }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              fontSize: "0.625rem",
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              color: "var(--ink)",
              fontWeight: 600,
            }}
          >
            § arkiv ledger
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-dim)", marginTop: "6px", lineHeight: 1.55 }}>
            Every run can persist a user-owned ledger of jobs, subtasks, routing decisions, and execution receipts on Arkiv Braga.
          </div>
        </div>
        <span
          style={{
            fontSize: "0.6875rem",
            fontFamily: "JetBrains Mono, monospace",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: "999px",
            border: "1.5px solid var(--ink)",
            background: "var(--cream)",
            color: "var(--ink)",
          }}
        >
          {receipt.status}
        </span>
      </div>

      {receipt.reason && (
        <div
          style={{
            fontSize: "0.8125rem",
            color: "var(--text)",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid var(--ink)",
            background: "rgba(255,255,255,0.55)",
          }}
        >
          {receipt.reason}
        </div>
      )}

      {receipt.status === "partial" && (
        <div
          style={{
            fontSize: "0.8125rem",
            color: "var(--text)",
            padding: "10px 12px",
            borderRadius: "12px",
            border: "1px solid var(--ink)",
            background: "rgba(255,255,255,0.55)",
          }}
        >
          Arkiv accepted part of the execution graph before a later transaction failed. The stored entity links below are real proofs and can still be queried.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card" style={{ padding: "12px 14px", background: "var(--bg-elev)" }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Requester
          </div>
          <div style={{ fontSize: "0.8125rem", marginTop: "6px", fontFamily: "JetBrains Mono, monospace", color: "var(--text)" }}>
            {receipt.requesterWallet ?? "No wallet linked"}
          </div>
        </div>
        <div className="card" style={{ padding: "12px 14px", background: "var(--bg-elev)" }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Creator
          </div>
          <div style={{ fontSize: "0.8125rem", marginTop: "6px", fontFamily: "JetBrains Mono, monospace", color: "var(--text)" }}>
            {receipt.creatorAddress ?? "Arkiv writes not configured"}
          </div>
        </div>
        <div className="card" style={{ padding: "12px 14px", background: "var(--bg-elev)" }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Query
          </div>
          {receipt.queryUrl ? (
            <a
              href={receipt.queryUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "0.8125rem", marginTop: "6px", color: "var(--accent)", textDecoration: "none" }}
            >
              Open project-filtered run query →
            </a>
          ) : (
            <div style={{ fontSize: "0.8125rem", marginTop: "6px", color: "var(--text-muted)" }}>
              Query unavailable
            </div>
          )}
        </div>
      </div>

      {receipt.job && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Stored entities
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <ReceiptLink label="Job" href={receipt.job.explorerUrl} value={receipt.job.entityKey} />
            {receipt.subtasks[0] && (
              <ReceiptLink
                label={`Subtasks (${receipt.subtasks.length})`}
                href={receipt.subtasks[0].explorerUrl}
                value={receipt.subtasks[0].entityKey}
              />
            )}
            {receipt.routingDecisions[0] && (
              <ReceiptLink
                label={`Routing (${receipt.routingDecisions.length})`}
                href={receipt.routingDecisions[0].explorerUrl}
                value={receipt.routingDecisions[0].entityKey}
              />
            )}
            {receipt.executionReceipts[0] && (
              <ReceiptLink
                label={`Receipts (${receipt.executionReceipts.length})`}
                href={receipt.executionReceipts[0].explorerUrl}
                value={receipt.executionReceipts[0].entityKey}
              />
            )}
          </div>
        </div>
      )}

      {receipt.status === "stored" && receipt.runId && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Live Arkiv queries
          </div>

          {loadingQueries && (
            <div className="card" style={{ padding: "14px 16px", background: "var(--bg-elev)" }}>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                Loading routing decisions and execution receipts from Arkiv...
              </div>
            </div>
          )}

          {queryError && (
            <div className="card" style={{ padding: "14px 16px", background: "var(--bg-elev)", color: "#B91C1C" }}>
              {queryError}
            </div>
          )}

          {queryData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {queryData.queries.map((query) => (
                  <a
                    key={query.label}
                    href={query.url}
                    target="_blank"
                    rel="noreferrer"
                    className="card"
                    style={{
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      textDecoration: "none",
                      color: "inherit",
                      background: "var(--bg-elev)",
                    }}
                  >
                    <div style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)", fontWeight: 600 }}>
                      {query.label}
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)", lineHeight: 1.55 }}>
                      {query.description}
                    </div>
                    <div style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--text)", wordBreak: "break-word" }}>
                      {query.filter}
                    </div>
                  </a>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <div className="card" style={{ padding: "16px", background: "var(--bg-elev)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Routing decisions
                    </div>
                    <div style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--accent)" }}>
                      {queryData.routingDecisions.length}
                    </div>
                  </div>

                  {queryData.routingDecisions.length === 0 ? (
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                      No routing decisions returned for this run yet.
                    </div>
                  ) : (
                    queryData.routingDecisions.map((entity) => (
                      <a
                        key={entity.entityKey}
                        href={entity.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
                          {entity.subtaskId ?? shortKey(entity.entityKey)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {entity.tier ?? "-"} / {entity.model ?? "-"} / {entity.agentId ?? "unassigned"}
                        </div>
                      </a>
                    ))
                  )}
                </div>

                <div className="card" style={{ padding: "16px", background: "var(--bg-elev)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Execution receipts
                    </div>
                    <div style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono, monospace", color: "var(--accent)" }}>
                      {queryData.executionReceipts.length}
                    </div>
                  </div>

                  {queryData.executionReceipts.length === 0 ? (
                    <div style={{ fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                      No execution receipts returned for this run yet.
                    </div>
                  ) : (
                    queryData.executionReceipts.map((entity) => (
                      <a
                        key={entity.entityKey}
                        href={entity.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text)" }}>
                          {entity.subtaskId ?? shortKey(entity.entityKey)}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {entity.status ?? "unknown"} / {entity.actualTokens?.toLocaleString() ?? 0} tokens
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {typeof entity.costEth === "number"
                            ? `${ethToUsdc(entity.costEth)} USD (${entity.costEth} ETH)`
                            : "Cost unavailable"}
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
