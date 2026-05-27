import {
  createPublicClient,
  createWalletClient,
  http,
  type CreateEntityParameters,
} from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { braga } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";
import type {
  OrchestrationRun,
  ArkivEntityRef,
  ArkivRunReceipt,
  ArkivEntityType,
  ArkivQueryLink,
  ArkivQueriedEntity,
  ArkivRunQueryData,
} from "./types";

export const PROJECT_ATTRIBUTE = {
  key: "project",
  value: "nomos-arkiv-ledger-leocagli-2026",
} as const;

const BRAGA_EXPLORER_BASE = "https://explorer.braga.hoodi.arkiv.network";
const BRAGA_DATA_EXPLORER_BASE = "https://data.arkiv.network/";

type ArkivAttribute = { key: string; value: string | number };
type ArkivQueryClause = { key: string; value: string | number };

type ArkivQueryEntity = {
  key: string;
  creator?: string | null;
  toJson(): unknown;
};

function requirePrivateKey(): `0x${string}` {
  const privateKey = process.env.ARKIV_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (!privateKey || !privateKey.startsWith("0x")) {
    throw new Error("Missing ARKIV_PRIVATE_KEY for Arkiv writes.");
  }
  return privateKey as `0x${string}`;
}

export function isArkivWriteEnabled(): boolean {
  return Boolean(process.env.ARKIV_PRIVATE_KEY ?? process.env.PRIVATE_KEY);
}

export function getArkivCreatorAddress(): string | undefined {
  if (!isArkivWriteEnabled()) return undefined;
  return privateKeyToAccount(requirePrivateKey()).address;
}

function getWalletClient() {
  return createWalletClient({
    chain: braga,
    transport: http(),
    account: privateKeyToAccount(requirePrivateKey()),
  });
}

export function getPublicClient() {
  return createPublicClient({
    chain: braga,
    transport: http(),
  });
}

export type ArkivJobPreview = {
  entityKey: string;
  goal: string;
  runId: string;
  requesterWallet: string | null;
  teamName: string | null;
  totalActualEth: number;
  totalNaiveEth: number;
  savedPct: number;
  creator: string | null;
  explorerUrl: string;
};

function toEntityExplorerUrl(entityKey: string): string {
  return `${BRAGA_EXPLORER_BASE}/entity/${entityKey}`;
}

function serializeClauseValue(value: string | number): string {
  return typeof value === "number" ? String(value) : `"${value}"`;
}

function buildArkivFilter(clauses: ArkivQueryClause[]): string {
  return clauses
    .map(({ key, value }) => `${key} = ${serializeClauseValue(value)}`)
    .join(" AND ");
}

export function buildArkivDataExplorerQueryUrl(
  clauses: ArkivQueryClause[],
): string {
  const query = buildArkivFilter(clauses);
  return `${BRAGA_DATA_EXPLORER_BASE}?q=${encodeURIComponent(query)}`;
}

function toDataExplorerQueryUrl(runId: string): string {
  return buildArkivDataExplorerQueryUrl([
    PROJECT_ATTRIBUTE,
    { key: "runId", value: runId },
  ]);
}

export function getArkivRunQueries(
  runId: string,
  requesterWallet?: string | null,
): ArkivQueryLink[] {
  const runScope = [PROJECT_ATTRIBUTE, { key: "runId", value: runId }];
  const queries: ArkivQueryLink[] = [
    {
      label: "Run ledger",
      description: "All entities persisted for this run.",
      filter: buildArkivFilter(runScope),
      url: buildArkivDataExplorerQueryUrl(runScope),
    },
    {
      label: "Routing decisions",
      description: "How each subtask was classified and assigned.",
      filter: buildArkivFilter([
        ...runScope,
        { key: "entityType", value: "routing_decision" },
      ]),
      url: buildArkivDataExplorerQueryUrl([
        ...runScope,
        { key: "entityType", value: "routing_decision" },
      ]),
    },
    {
      label: "Execution receipts",
      description: "Execution outcomes, tokens, and recorded costs for this run.",
      filter: buildArkivFilter([
        ...runScope,
        { key: "entityType", value: "execution_receipt" },
      ]),
      url: buildArkivDataExplorerQueryUrl([
        ...runScope,
        { key: "entityType", value: "execution_receipt" },
      ]),
    },
  ];

  if (requesterWallet) {
    queries.push({
      label: "Receipts by requester",
      description: "Execution receipts filtered to the wallet tagged on the run.",
      filter: buildArkivFilter([
        PROJECT_ATTRIBUTE,
        { key: "requesterWallet", value: requesterWallet },
        { key: "entityType", value: "execution_receipt" },
      ]),
      url: buildArkivDataExplorerQueryUrl([
        PROJECT_ATTRIBUTE,
        { key: "requesterWallet", value: requesterWallet },
        { key: "entityType", value: "execution_receipt" },
      ]),
    });
  }

  return queries;
}

function summarizeArkivEntity(
  entityType: ArkivEntityType,
  entity: ArkivQueryEntity,
): ArkivQueriedEntity {
  const payload = (entity.toJson() as Record<string, unknown>) ?? {};

  return {
    entityKey: entity.key,
    entityType,
    creator: entity.creator ?? null,
    explorerUrl: toEntityExplorerUrl(entity.key),
    subtaskId:
      typeof payload.subtaskId === "string" ? payload.subtaskId : undefined,
    agentId:
      typeof payload.agentId === "string" ? payload.agentId : null,
    model: typeof payload.model === "string" ? (payload.model as "haiku" | "sonnet" | "opus") : undefined,
    tier: typeof payload.tier === "string" ? (payload.tier as "simple" | "moderate" | "complex") : undefined,
    status: typeof payload.status === "string" ? payload.status : undefined,
    actualTokens:
      typeof payload.actualTokens === "number" ? payload.actualTokens : undefined,
    costEth: typeof payload.costEth === "number" ? payload.costEth : undefined,
    outputPreview:
      typeof payload.outputPreview === "string" || payload.outputPreview === null
        ? (payload.outputPreview as string | null)
        : undefined,
  };
}

async function fetchRunEntities(
  runId: string,
  entityType: ArkivEntityType,
): Promise<ArkivQueriedEntity[]> {
  const creatorAddress = getArkivCreatorAddress();
  let query = getPublicClient()
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .where(eq("runId", runId))
    .where(eq("entityType", entityType))
    .withPayload(true)
    .withMetadata(true)
    .limit(24);

  if (creatorAddress) {
    query = query.createdBy(creatorAddress as `0x${string}`);
  }

  const result = await query.fetch();

  return result.entities
    .map((entity) => summarizeArkivEntity(entityType, entity as ArkivQueryEntity))
    .sort((left, right) => {
      const leftId = left.subtaskId ?? left.entityKey;
      const rightId = right.subtaskId ?? right.entityKey;
      return leftId.localeCompare(rightId);
    });
}

export async function fetchRunLedgerFromArkiv(
  runId: string,
  requesterWallet?: string | null,
): Promise<ArkivRunQueryData> {
  const [routingDecisions, executionReceipts] = await Promise.all([
    fetchRunEntities(runId, "routing_decision"),
    fetchRunEntities(runId, "execution_receipt"),
  ]);

  return {
    runId,
    queries: getArkivRunQueries(runId, requesterWallet),
    routingDecisions,
    executionReceipts,
  };
}

function baseAttributes(
  entityType: ArkivEntityType,
  run: OrchestrationRun,
): ArkivAttribute[] {
  const attrs: ArkivAttribute[] = [
    PROJECT_ATTRIBUTE,
    { key: "entityType", value: entityType },
    { key: "runId", value: run.id },
    { key: "createdAt", value: Date.parse(run.created_at) },
    { key: "status", value: run.status },
  ];

  if (run.team_id) attrs.push({ key: "teamId", value: run.team_id });
  if (run.team_name) attrs.push({ key: "teamName", value: run.team_name });
  if (run.requester_wallet) attrs.push({ key: "requesterWallet", value: run.requester_wallet });

  return attrs;
}

async function createEntity(
  entityType: ArkivEntityType,
  payload: Record<string, unknown>,
  attributes: ArkivAttribute[],
  expiresIn: number,
): Promise<ArkivEntityRef> {
  const walletClient = getWalletClient();
  const { entityKey, txHash } = await walletClient.createEntity({
    payload: jsonToPayload(payload),
    contentType: "application/json",
    attributes,
    expiresIn,
  });

  return {
    entityType,
    entityKey,
    txHash,
    explorerUrl: toEntityExplorerUrl(entityKey),
  };
}

async function createEntitiesBatch(
  entityType: ArkivEntityType,
  creates: CreateEntityParameters[],
): Promise<ArkivEntityRef[]> {
  if (creates.length === 0) return [];

  const walletClient = getWalletClient();
  const { createdEntities, txHash } = await walletClient.mutateEntities({
    creates,
  });

  return createdEntities.map((entityKey) => ({
    entityType,
    entityKey,
    txHash,
    explorerUrl: toEntityExplorerUrl(entityKey),
  }));
}

export async function persistRunToArkiv(run: OrchestrationRun): Promise<ArkivRunReceipt> {
  if (!isArkivWriteEnabled()) {
    return {
      status: "skipped",
      runId: run.id,
      reason: "Connect Arkiv server credentials to persist receipts on Braga.",
      requesterWallet: run.requester_wallet ?? null,
      creatorAddress: undefined,
      queryUrl: toDataExplorerQueryUrl(run.id),
      subtasks: [],
      routingDecisions: [],
      executionReceipts: [],
    };
  }

  const creatorAddress = getArkivCreatorAddress();
  const receipt: ArkivRunReceipt = {
    status: "pending",
    runId: run.id,
    creatorAddress,
    requesterWallet: run.requester_wallet ?? null,
    queryUrl: toDataExplorerQueryUrl(run.id),
    subtasks: [],
    routingDecisions: [],
    executionReceipts: [],
  };

  try {
    const job = await createEntity(
      "job",
      {
        runId: run.id,
        goal: run.goal,
        requesterWallet: run.requester_wallet ?? null,
        teamId: run.team_id ?? null,
        teamName: run.team_name ?? null,
        totalActualEth: run.total_actual_eth,
        totalNaiveEth: run.total_naive_eth,
        savedPct: run.saved_pct,
        createdAt: run.created_at,
      },
      [
        ...baseAttributes("job", run),
        { key: "subtaskCount", value: run.subtasks.length },
        { key: "savedPctTenth", value: Math.round(run.saved_pct * 10) },
        { key: "totalActualEthMicros", value: Math.round(run.total_actual_eth * 1_000_000) },
        { key: "totalNaiveEthMicros", value: Math.round(run.total_naive_eth * 1_000_000) },
      ],
      ExpirationTime.fromDays(30),
    );
    receipt.job = job;

    const subtaskCreates: CreateEntityParameters[] = run.subtasks.map((subtask) => ({
      payload: jsonToPayload({
        runId: run.id,
        subtaskId: subtask.id,
        description: subtask.description,
        skillHint: subtask.classification?.reason ?? null,
        status: subtask.status,
        tier: subtask.tier,
        model: subtask.model,
        agentId: subtask.agent_id,
      }),
      contentType: "application/json",
      attributes: [
        ...baseAttributes("subtask", run),
        { key: "jobKey", value: job.entityKey },
        { key: "subtaskId", value: subtask.id },
        { key: "tier", value: subtask.tier },
        { key: "model", value: subtask.model },
        { key: "agentId", value: subtask.agent_id || "unassigned" },
        { key: "estimatedTokens", value: subtask.classification?.estimated_tokens ?? 0 },
      ],
      expiresIn: ExpirationTime.fromDays(14),
    }));
    receipt.subtasks = await createEntitiesBatch("subtask", subtaskCreates);

    const routingCreates: CreateEntityParameters[] = run.subtasks.map((subtask, index) => ({
      payload: jsonToPayload({
        runId: run.id,
        subtaskId: subtask.id,
        tier: subtask.tier,
        model: subtask.model,
        agentId: subtask.agent_id,
        classification: subtask.classification ?? null,
      }),
      contentType: "application/json",
      attributes: [
        ...baseAttributes("routing_decision", run),
        { key: "jobKey", value: job.entityKey },
        { key: "subtaskKey", value: receipt.subtasks[index]!.entityKey },
        { key: "subtaskId", value: subtask.id },
        { key: "tier", value: subtask.tier },
        { key: "model", value: subtask.model },
        { key: "agentId", value: subtask.agent_id || "unassigned" },
        { key: "estimatedTokens", value: subtask.classification?.estimated_tokens ?? 0 },
      ],
      expiresIn: ExpirationTime.fromDays(21),
    }));
    receipt.routingDecisions = await createEntitiesBatch("routing_decision", routingCreates);

    const executionCreates: CreateEntityParameters[] = run.subtasks.map((subtask, index) => ({
      payload: jsonToPayload({
        runId: run.id,
        subtaskId: subtask.id,
        status: subtask.status,
        actualTokens: subtask.actual_tokens,
        costEth: subtask.cost_eth,
        outputPreview: subtask.output?.slice(0, 280) ?? null,
        error: subtask.error ?? null,
      }),
      contentType: "application/json",
      attributes: [
        ...baseAttributes("execution_receipt", run),
        { key: "jobKey", value: job.entityKey },
        { key: "subtaskKey", value: receipt.subtasks[index]!.entityKey },
        { key: "routingDecisionKey", value: receipt.routingDecisions[index]!.entityKey },
        { key: "subtaskId", value: subtask.id },
        { key: "executionStatus", value: subtask.status },
        { key: "actualTokens", value: subtask.actual_tokens },
        { key: "costEthMicros", value: Math.round(subtask.cost_eth * 1_000_000) },
      ],
      expiresIn: ExpirationTime.fromDays(7),
    }));
    receipt.executionReceipts = await createEntitiesBatch("execution_receipt", executionCreates);

    for (const [index, subtask] of run.subtasks.entries()) {
      const subtaskEntity = receipt.subtasks[index]!;
      const routingDecision = receipt.routingDecisions[index]!;
      const executionReceipt = receipt.executionReceipts[index]!;

      subtask.arkiv = {
        subtaskEntityKey: subtaskEntity.entityKey,
        routingDecisionKey: routingDecision.entityKey,
        executionReceiptKey: executionReceipt.entityKey,
      };
    }

    receipt.status = "stored";
    return receipt;
  } catch (error) {
    const hasAnyEntity = Boolean(receipt.job)
      || receipt.subtasks.length > 0
      || receipt.routingDecisions.length > 0
      || receipt.executionReceipts.length > 0;

    return {
      ...receipt,
      status: hasAnyEntity ? "partial" : "failed",
      reason: error instanceof Error ? error.message : "Failed to write Arkiv receipts.",
    };
  }
}

export async function verifyProjectNamespace() {
  const creatorAddress = getArkivCreatorAddress();
  if (!creatorAddress) {
    return { status: "skipped" as const, count: 0 };
  }

  const result = await getPublicClient()
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .createdBy(creatorAddress as `0x${string}`)
    .limit(5)
    .fetch();

  return { status: "ok" as const, count: result.entities.length };
}

export async function fetchRecentArkivJobs(
  limit = 6,
): Promise<ArkivJobPreview[]> {
  const creatorAddress = getArkivCreatorAddress();
  if (!creatorAddress) {
    return [];
  }

  const result = await getPublicClient()
    .buildQuery()
    .where(eq(PROJECT_ATTRIBUTE.key, PROJECT_ATTRIBUTE.value))
    .where(eq("entityType", "job"))
    .createdBy(creatorAddress as `0x${string}`)
    .withPayload(true)
    .withMetadata(true)
    .limit(limit)
    .fetch();

  return result.entities.map((entity) => {
    const payload = entity.toJson() as {
      goal?: string;
      runId?: string;
      requesterWallet?: string | null;
      teamName?: string | null;
      totalActualEth?: number;
      totalNaiveEth?: number;
      savedPct?: number;
    };

    return {
      entityKey: entity.key,
      goal: payload.goal ?? "Untitled run",
      runId: payload.runId ?? entity.key,
      requesterWallet: payload.requesterWallet ?? null,
      teamName: payload.teamName ?? null,
      totalActualEth: payload.totalActualEth ?? 0,
      totalNaiveEth: payload.totalNaiveEth ?? 0,
      savedPct: payload.savedPct ?? 0,
      creator: entity.creator ?? null,
      explorerUrl: toEntityExplorerUrl(entity.key),
    };
  });
}
