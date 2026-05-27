const DEFAULT_GOAL =
  "Design pricing, draft a launch memo, and format a final FAQ for customers.";
const DEFAULT_REQUESTER_WALLET =
  "0x670E8E7b3545b4b0bDFF99A5DcdbAfB1bcFC700f";

function getArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function normalizeBaseUrl(value) {
  if (!value) {
    throw new Error("Missing --url <deployment-url>.");
  }
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function expectJsonOk(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  let body = null;

  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${path} but received: ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${text.slice(0, 300)}`);
  }

  return body;
}

async function runOrchestrate(baseUrl, goal, requesterWallet) {
  const response = await fetch(`${baseUrl}/api/orchestrate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      goal,
      requester_wallet: requesterWallet,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`POST /api/orchestrate failed with ${response.status}`);
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";
  let runId = null;
  let completedEvent = null;
  let errorEvent = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (buffer.includes("\n\n")) {
      const boundary = buffer.indexOf("\n\n");
      const chunk = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (!chunk.startsWith("data: ")) continue;
      const raw = chunk.slice(6);
      let event;
      try {
        event = JSON.parse(raw);
      } catch {
        continue;
      }

      if (event.type === "run_created") {
        runId = event.run?.id ?? runId;
      }
      if (event.type === "run_completed") {
        completedEvent = event;
      }
      if (event.type === "error") {
        errorEvent = event;
      }
    }
  }

  if (errorEvent) {
    throw new Error(`Orchestrate stream returned error: ${errorEvent.message}`);
  }
  if (!runId) {
    throw new Error("Orchestrate stream did not expose a run id.");
  }
  if (!completedEvent) {
    throw new Error(`Run ${runId} did not emit a run_completed event.`);
  }

  return { runId, completedEvent };
}

async function main() {
  const baseUrl = normalizeBaseUrl(getArg("--url"));
  const goal = getArg("--goal", DEFAULT_GOAL);
  const requesterWallet = getArg("--requester-wallet", DEFAULT_REQUESTER_WALLET);

  console.log(`Smoke testing ${baseUrl}`);

  const supabaseCheck = await expectJsonOk(baseUrl, "/api/supabase-check");
  console.log("supabase-check", JSON.stringify(supabaseCheck, null, 2));

  await expectJsonOk(baseUrl, "/api/agents");
  await expectJsonOk(baseUrl, "/api/teams");
  await expectJsonOk(baseUrl, "/api/runs");

  const { runId, completedEvent } = await runOrchestrate(
    baseUrl,
    goal,
    requesterWallet,
  );
  console.log(`run completed: ${runId}`);
  console.log("run_completed", JSON.stringify(completedEvent, null, 2));

  const arkivRun = await expectJsonOk(
    baseUrl,
    `/api/arkiv/runs/${encodeURIComponent(runId)}?requesterWallet=${encodeURIComponent(requesterWallet)}`,
  );
  console.log("arkiv-run", JSON.stringify(arkivRun, null, 2));

  const receipt = completedEvent.arkiv ?? null;
  const summary = {
    runId,
    ledgerStatus: receipt?.status ?? null,
    queryUrl: receipt?.queryUrl ?? null,
    jobTxHash: receipt?.job?.txHash ?? null,
    firstSubtaskTxHash: receipt?.subtasks?.[0]?.txHash ?? null,
  };

  console.log("summary", JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
