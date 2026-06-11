# Runtime, Indexer, and Database

The Agent Economy is non-custodial and wallet-authorized. New Work, Court, and Sentinel writes remain disabled until hardened contracts are deployed. Future keepers may call only permissionless recovery or already-funded execution paths and must not custody user funds.

The Vercel frontend is request-driven and stateless. The civilization layer that runs while no human is watching lives in three separate workspaces designed to be hosted on **persistent** infrastructure (a Linux VM, a Fly machine, a Kubernetes deployment — anything but a serverless function). This document describes the contract and shape they implement.

---

## 1. `apps/runtime` — the autonomous agent loop

```ts
// apps/runtime/src/index.ts
type LoopStep = "observe" | "think" | "plan" | "negotiate" | "execute" | "reflect" | "learn" | "broadcast";

export function runAutonomousTick(tick = Date.now()): WorldEvent[];
```

Per tick, the runtime walks each agent through the eight steps and emits a `WorldEvent`. The default implementation generates deterministic events from `@somniacos/shared` so the runtime can be smoke-tested without any infrastructure:

```bash
pnpm runtime
# [market] Vector Marketing observe: Vector Marketing scanned market tasks, ...
# [market] Vector Marketing think:   ...
# ...
```

### Production responsibilities

When deployed against real infrastructure, each loop step is intended to:

| Step | Read source | Mutates |
|------|-------------|---------|
| `observe` | `Marketplace` + `Treasury` + `WorldEventRegistry` events | nothing |
| `think` | Postgres memory + Redis cache of recent prices | nothing |
| `plan` | Internal scoring | nothing |
| `negotiate` | `NegotiationRegistry` events | submits new negotiation rows |
| `execute` | — | `Marketplace.hire`, `Escrow.fund`, `Treasury.spend` |
| `reflect` | Step output | writes a `memories` row + optional pgvector embedding |
| `learn` | Step output | adjusts agent-local pricing / risk models in Redis |
| `broadcast` | Step output | `WorldEventRegistry.record` (anchors the world event) |

### Wallet expectations

Each agent identity needs a Somnia wallet (its `wallet` field in `AgentRegistry`). Production runtimes are expected to manage agent keys via a KMS / signer service. The `PRIVATE_KEY` env var is **only** for deploy and seed scripts, not for the runtime.

---

## 2. `apps/indexer` — the event indexer

```ts
// apps/indexer/src/index.ts
export function describeIndexerPlan(): {
  rpcUrl: string;
  latestIndexedBlock: string;
  eventFamilies: string[];
  outputs: ["indexed_contract_events", "world_events", "websocket:broadcast"];
};
```

The current file is a deliberate scaffold: it enumerates the event families that the production indexer must consume. Running `pnpm indexer` prints the plan as JSON for verification.

### Production responsibilities

- Maintain a watermark cursor (`LATEST_INDEXED_BLOCK`).
- For each block range, `eth_getLogs` for the address set in `apps/web/lib/contracts.ts` plus the OS kernel addresses.
- Decode logs against the ABIs in `apps/web/lib/contracts.ts` (the same ABIs the frontend uses).
- Insert into `indexed_contract_events` and project relevant rows into `world_events`.
- Push deltas to subscribers via a WebSocket fanout.

### Event families consumed

```
AgentCreated, OrganizationCreated, TaskPosted, ProposalSubmitted,
NegotiationUpdated, AgentHired, PaymentEscrowed, TaskCompleted,
PaymentReleased, ReputationUpdated, DisputeOpened, PartnershipCreated,
SubscriptionCreated, GovernanceProposalCreated, GovernanceVoteCast,
WorldEventRecorded, AgentRunRequested, AgentRunCompleted,
OSAgentRunRequested, OSAgentRunCompleted,
ProtocolFeePaid, PolicyCreated, ProcessCreated, ProcessStarted,
ProcessStepRequested, ProcessStepCompleted, ProcessCompleted,
ProcessFailed, ProcessCancelled,
MemoryWritten, AgentHandoff, ProcessEvaluation,
CapabilityRegistered, CapabilityUpdated, CapabilityStatusChanged
```

---

## 3. `apps/api` — surface descriptor

`apps/api/src/index.ts` is a minimal program that prints the API surface for use by API gateways and the integration test harness. It does not run an HTTP server itself — production deployments are expected to host the Next.js frontend's API routes (`apps/web/app/api/*`) and treat them as the single authoritative HTTP surface. This package primarily exists to keep the surface description in one place that both the runtime and the indexer can `import`.

---

## 4. `packages/db` — schema

`packages/db/schema.sql` defines the Postgres tables used by the runtime and indexer. Apply it with `psql $DATABASE_URL -f packages/db/schema.sql` (the `vector` column requires the [`pgvector`](https://github.com/pgvector/pgvector) extension installed in the target database).

| Table | Purpose | Primary writer |
|-------|---------|----------------|
| `agents` | Mirror of `AgentRegistry`-derived state | indexer |
| `organizations` | Mirror of `OrganizationRegistry` | indexer |
| `tasks` | Mirror of `Marketplace` | indexer |
| `negotiations` | Mirror of `NegotiationRegistry` | indexer |
| `world_events` | Real-time feed for UI | runtime + indexer |
| `memories` | Per-agent memory; `embedding vector` column for similarity search | runtime (`reflect` step) |
| `reputation_events` | Per-agent reputation deltas | indexer |
| `security_alerts` | Anomaly stream | runtime (`security_monitor` agent) + indexer |
| `indexed_contract_events` | Raw decoded events, deduped by id | indexer |

```sql
-- packages/db/schema.sql excerpt
create table if not exists indexed_contract_events (
  id text primary key,
  chain_id text not null,
  block_number bigint not null,
  transaction_hash text not null,
  event_name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists memories (
  id text primary key,
  agent_id text not null,
  memory_type text not null,
  content text not null,
  embedding vector,
  created_at timestamptz not null default now()
);
```

### ID convention

`indexed_contract_events.id` is `${transaction_hash}-${log_index}` so the table is naturally idempotent on re-indexing.

---

## 5. Hosting model

| Component | Recommended host | Why |
|-----------|------------------|-----|
| `apps/web` | Vercel | Serverless suits the request surface; CDN edges land close to wallet UI users. |
| `apps/runtime` | Long-running VM / container (Fly, Render, Hetzner, Linode) | Needs persistent open connections and per-agent in-memory state. |
| `apps/indexer` | Same as runtime, OR a worker per chain | Needs websocket + watermark continuity. |
| Postgres | Neon / Supabase / RDS with pgvector | Indexer + runtime co-host data here. |
| Redis | Upstash / managed Redis | Runtime cache + ephemeral coordination. |
| Vector DB | Pinecone / Qdrant / pgvector | `VECTOR_DATABASE_URL` if not using pgvector. |

The VPS attempt at `172.236.110.179` is documented as not currently deployable (SSH banner timeout). Use Vercel + a managed worker host until the VPS network is repaired.

---

## 6. Observability

The runtime and indexer should publish:

- A `metrics` endpoint (`/healthz`, `/metricsz`) for the platform host.
- Tick durations and per-step error counts.
- Indexer lag (`latest_chain_block - latest_indexed_block`).
- Agent budget burn rate per organization, sourced from `BudgetSet` + `TreasurySpent` events.

`scripts/healthcheck.ts` is a minimal entry point that confirms the configured RPC and contract addresses are responsive.
