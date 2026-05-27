# Nomos

Nomos turns agent work into user-owned execution history.

Instead of hiding orchestration inside app logs, Nomos writes each run to Arkiv Braga as a queryable graph of records and transactions. That makes the routing path inspectable after the run ends, not just while it streams.

Every run is modeled as four Arkiv entity types:

- `job`
- `subtask`
- `routing_decision`
- `execution_receipt`

Each entity carries the same `PROJECT_ATTRIBUTE`, a typed `entityType`, relationship keys to its parent entity, and an expiration policy sized to its lifetime.

## What the product sells

- User-owned execution history for agent work
- Queryable routing decisions instead of opaque orchestration
- Receipts and transaction links that survive beyond one UI session
- A server-signed Arkiv ledger that can still attribute work back to a requester wallet

## Why this fits Arkiv

- AI track: the run history and routing memory are portable instead of hidden in platform logs.
- Privacy / attribution: a requester wallet can be attached to a run, while Arkiv preserves immutable `$creator` attribution for the backend writer.
- Queryability: the app reads recent jobs back from Arkiv using `PROJECT_ATTRIBUTE + entityType + createdBy`, and can drill into routing decisions and execution receipts per run.

## Proof Of Flow

The current workspace has already produced real Arkiv writes from the local mock pipeline using the funded writer wallet `0x670E8E7b3545b4b0bDFF99A5DcdbAfB1bcFC700f`.

Observed stored run proof:

- Run ID: `665a14a2-aea8-40aa-af53-1817297a9915`
- Requester wallet: `0x670E8E7b3545b4b0bDFF99A5DcdbAfB1bcFC700f`
- Query URL: `https://data.arkiv.network/?q=project%20%3D%20%22nomos-arkiv-ledger-leocagli-2026%22%20AND%20runId%20%3D%20%22665a14a2-aea8-40aa-af53-1817297a9915%22`

Observed entity proofs:

- Job entity: `0xe9691cebea4998b0d501ab0fcee4d1b637d9f3481ac8a9c0fa3661929e241224`
	- Tx hash: `0x43337a7658dd9aeca559cef0f8f958bbf4fad50b5ac9d14d324a72f46da2af13`
	- Explorer: `https://explorer.braga.hoodi.arkiv.network/entity/0xe9691cebea4998b0d501ab0fcee4d1b637d9f3481ac8a9c0fa3661929e241224`
- First subtask entity: `0x4688823dc1d9bc031077acb35f3c5f0ec60c492bdc617c96a25219a613013eb4`
	- Tx hash: `0x2ec9f4ddb5f03990bcdf1b1cf3dcc26cbe9e3e2484c69e930286c84de97e968c`
	- Explorer: `https://explorer.braga.hoodi.arkiv.network/entity/0x4688823dc1d9bc031077acb35f3c5f0ec60c492bdc617c96a25219a613013eb4`
- First routing decision entity: `0x5c5701787db4c0f0693b7b3ce3b2168ba5a48b106344281f0311948486859c1c`
	- Tx hash: `0x8ebd4fa645f4ecd855fdf21ab841d254cc225e2faa0af71f4ddee31f612bc55d`
	- Explorer: `https://explorer.braga.hoodi.arkiv.network/entity/0x5c5701787db4c0f0693b7b3ce3b2168ba5a48b106344281f0311948486859c1c`
- First execution receipt entity: `0xc9a70bde9d8d9dc1c16f7f44c686374adf177c976d0bb713b7bebe8b913c13e9`
	- Tx hash: `0x6ad2a92bf27c0b2aefdb01dde9b3bd2a90878eb3d636e524f6f0ac7f5657ab96`
	- Explorer: `https://explorer.braga.hoodi.arkiv.network/entity/0xc9a70bde9d8d9dc1c16f7f44c686374adf177c976d0bb713b7bebe8b913c13e9`

Important current behavior:

- The funded mock flow creates real Arkiv entities and returns real tx hashes.
- The run now reaches `stored` after batching writes by phase instead of sending one transaction per entity.
- Subtasks, routing decisions, and execution receipts are still independently queryable in data.arkiv after the run completes.

## Data.Arkiv Queries

Project-scoped run ledger:

```text
project = "nomos-arkiv-ledger-leocagli-2026" AND runId = "665a14a2-aea8-40aa-af53-1817297a9915"
```

Routing decisions for the run:

```text
project = "nomos-arkiv-ledger-leocagli-2026" AND runId = "665a14a2-aea8-40aa-af53-1817297a9915" AND entityType = "routing_decision"
```

Execution receipts for the run:

```text
project = "nomos-arkiv-ledger-leocagli-2026" AND runId = "665a14a2-aea8-40aa-af53-1817297a9915" AND entityType = "execution_receipt"
```

Execution receipts by requester wallet:

```text
project = "nomos-arkiv-ledger-leocagli-2026" AND requesterWallet = "0x670E8E7b3545b4b0bDFF99A5DcdbAfB1bcFC700f" AND entityType = "execution_receipt"
```

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The example env file now includes the minimum deploy-relevant variables. Keep `ARKIV_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, and `GITHUB_TOKEN` server-only in Vercel.

## Deploying to Vercel

Nomos should be deployed with Arkiv writes enabled from a server-side wallet, not from the browser and not from local-only state.

Recommended production model:

1. Create a dedicated writer wallet for Arkiv Braga.
2. Fund that wallet so it can submit entity writes.
3. Add its private key only to Vercel as `ARKIV_PRIVATE_KEY`.
4. Keep the requester wallet as user attribution only.
5. Verify each run from the receipt panel using entity links and Arkiv query links.

The app already uses route handlers for writes, which means the frontend triggers the action but Vercel signs the Arkiv transaction server-side.

## Environment

- `ANTHROPIC_API_KEY`: required for orchestration, classification, and execution.
- If `ANTHROPIC_API_KEY` is missing in local development, Nomos falls back to a deterministic mock pipeline so you can keep iterating on UI and Arkiv flows.
- `ARKIV_PRIVATE_KEY`: required for writing Arkiv entities on Braga. Store this only as a server-side env var in Vercel.
- `NEXT_PUBLIC_ETH_PRICE_USD`: optional display-rate override for USD-first pricing in the UI.
- `GITHUB_TOKEN`: optional, raises GitHub API limits for specialist registration.
- `MOCK_MODE=1`: optional, forces deterministic mock orchestration and disables live GitHub registration.
- `FORCE_ROUTING=pricing=complex,landing=moderate,faq=simple`: optional, pins routing tiers for demos.

### Environment by target

Use `preview` first to validate infrastructure, then promote the same shape to `production`.

| Variable | Preview | Production | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required if auth/profile flows are enabled | Required if auth/profile flows are enabled | Public env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required if auth/profile flows are enabled | Required if auth/profile flows are enabled | Public env |
| `NEXT_PUBLIC_SITE_URL` | Required | Required | Must match deployed URL and Supabase callback config |
| `NEXT_PUBLIC_ETH_PRICE_USD` | Optional | Optional | Public display override |
| `ARKIV_PRIVATE_KEY` | Recommended | Required | Server-only; keep writer wallet off the client |
| `ANTHROPIC_API_KEY` | Optional for first smoke test | Required | Use `MOCK_MODE=1` in preview if you only want to validate hosted infra + Arkiv |
| `GITHUB_TOKEN` | Optional | Optional | Server-only |
| `MOCK_MODE` | Allowed | Avoid | Use `1` only for deterministic preview validation |
| `FORCE_ROUTING` | Optional | Optional | Demo-only override |

Recommended policy:

1. `preview`: use a funded Braga wallet, set `NEXT_PUBLIC_SITE_URL` to the preview URL, and allow `MOCK_MODE=1` for the cheapest end-to-end test.
2. `production`: remove `MOCK_MODE`, require `ANTHROPIC_API_KEY`, and keep `ARKIV_PRIVATE_KEY` scoped to production unless preview writes are intentional.

### Vercel checklist

1. Add all required environment variables in the Vercel project settings.
2. Mark `ARKIV_PRIVATE_KEY` as production-only unless preview deployments should also write to Arkiv.
3. Hit `/api/supabase-check` on the hosted deployment and confirm it reports the expected Supabase, Anthropic/mock, Arkiv, and site-url configuration.
4. Deploy and run one orchestration flow from the hosted app.
5. Confirm the receipt panel shows a stored/skipped/failed ledger state.
6. Open the entity explorer links and Arkiv data queries to verify the write.

### Hosted smoke test

Run the hosted validation in this order:

1. `GET /api/supabase-check`
2. Open `/`
3. `GET /api/agents`
4. `GET /api/teams`
5. `GET /api/runs`
6. `POST /api/orchestrate`
7. Wait for the streamed run to complete and capture the `runId`
8. `GET /api/arkiv/runs/[runId]`
9. Open at least one Arkiv explorer link and the run-scoped `data.arkiv` query

You can automate most of that sequence against a deployed URL with:

```bash
npm run smoke:deploy -- --url https://your-deployment-url
```

Optional flags:

- `--goal "..."`
- `--requester-wallet 0x...`

Minimum acceptance for a good deploy:

1. `/api/supabase-check` returns the expected env mode and does not hide missing config.
2. One hosted run finishes without runtime errors.
3. The ledger ends in `stored` or in an intentional `skipped` state.
4. The hosted run exposes a real `runId`, Arkiv query URL, and at least one entity `txHash`.

## Arkiv model

`PROJECT_ATTRIBUTE`:

```ts
{ key: "project", value: "nomos-arkiv-ledger-leocagli-2026" }
```

Entity relationships:

- `subtask.jobKey -> job.entityKey`
- `routing_decision.jobKey -> job.entityKey`
- `routing_decision.subtaskKey -> subtask.entityKey`
- `execution_receipt.jobKey -> job.entityKey`
- `execution_receipt.subtaskKey -> subtask.entityKey`
- `execution_receipt.routingDecisionKey -> routing_decision.entityKey`

Expiration policy:

- `job`: 30 days
- `routing_decision`: 21 days
- `subtask`: 14 days
- `execution_receipt`: 7 days

## Main routes

- `/`: landing page plus recent in-memory runs and recent Arkiv jobs fetched back from Braga
- `/orchestrate`: live run page that writes Arkiv receipts after execution
- `/profile`: connect a wallet so Nomos can tag the requester on each run

## Verification

```bash
npm run build
npm test
```

`npm run build` passes.

`npm test` passes in the current workspace.

Local proof path:

1. Start the app with `.env.local` configured.
2. Run `/orchestrate` in `MOCK_MODE=1`.
3. Wait for the `Ledger` stage to begin.
4. Open the receipt panel and inspect entity links plus data.arkiv query links.
5. Cross-check the run from `/api/runs` to see whether the receipt is `stored`, `partial`, `skipped`, or `failed`.
