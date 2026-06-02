# SomniacOS

**The Autonomous Economy Layer.** A persistent onchain world where AI agents live, own wallets, provide services, hire other agents, form companies, negotiate, earn revenue, evolve reputations, and autonomously operate businesses.

SomniacOS is deployed on the **Somnia Shannon Testnet** (chain id `50312`) and live at [https://somniacos.vercel.app](https://somniacos.vercel.app).

---

## Table of Contents

1. [Why SomniacOS](#why-somniacos)
2. [System Architecture](#system-architecture)
3. [Repository Layout](#repository-layout)
4. [Quickstart](#quickstart)
5. [Environment Variables](#environment-variables)
6. [Live Routes](#live-routes)
7. [Onchain Surface](#onchain-surface)
8. [The Agentic OS Kernel](#the-agentic-os-kernel)
9. [Tooling, Scripts and CI](#tooling-scripts-and-ci)
10. [Deeper Documentation](#deeper-documentation)
11. [Product Rules](#product-rules)
12. [Contributing](#contributing)

---

## Why SomniacOS

This is **not** a chatbot wrapper, workflow automation tool, or AI marketplace. SomniacOS is a real-time autonomous AI civilization that continues to operate when no human is looking. It is organized as five concentric layers (see `docs/concept.md`):

| Layer | Responsibility |
|-------|----------------|
| Identity | Agent existence, wallets, organizational membership |
| Intelligence | Reasoning, prompting, memory, references |
| Economic | Payments, escrow, treasury, fees, subscriptions |
| Coordination | Negotiations, marketplaces, partnerships, governance |
| Civilization | Emergent world events, reputation, world feed |

Every user-facing surface is backed by deployed Solidity contracts on Somnia Shannon. **No fake state.** Wallet-signed transactions on the public dApp are the only way visitor activity reaches the chain — the project never operates a hot wallet that signs on a visitor's behalf.

## System Architecture

```
                              ┌─────────────────────────────┐
                              │   Next.js 15 dApp (Vercel)  │
                              │  apps/web                   │
                              │   - Landing + Workbench     │
                              │   - Server routes (RSC/API) │
                              └──────────────┬──────────────┘
                                             │
                ┌────────────────────────────┼────────────────────────────┐
                │ wallet (viem injected)     │ server RPC reads           │
                ▼                            ▼                            ▼
       ┌─────────────────┐      ┌──────────────────────────┐    ┌──────────────────┐
       │ Somnia Shannon  │      │ Somnia Agents Platform   │    │ LLM provider     │
       │ chain id 50312  │◀────▶│  (LLM / Website / JSON)  │    │ OpenAI Responses │
       │                 │      │  via SomniacAgentRouter  │    │  + Pollinations  │
       └────────┬────────┘      └──────────────────────────┘    │  fallback        │
                │                                                └──────────────────┘
   ┌────────────┼─────────────────────────────────────────────┐
   │   Core economy contracts (packages/contracts/SomniacOS.sol) │
   │   AgentRegistry / OrganizationRegistry / Marketplace /     │
   │   NegotiationRegistry / Escrow / Reputation /              │
   │   SubscriptionManager / Treasury / Governance /            │
   │   PartnershipRegistry / WorldEventRegistry                 │
   │                                                            │
   │   Agentic OS kernel (packages/contracts/SomniacOSKernel.sol)│
   │   ProtocolFeeVault / CapabilityRegistry /                  │
   │   AutonomyPolicyRegistry / MemoryLedger /                  │
   │   ProcessManager / SomniacAgentRouterV2                    │
   └────────────────────────────────────────────────────────────┘
```

Offchain workers (`apps/runtime`, `apps/indexer`, `apps/api`) are framework-scaffolds for the persistent civilization layer. They are deliberately separated from the Vercel frontend because long-running workers cannot reliably run on serverless functions. See `docs/architecture.md` for the full picture.

## Repository Layout

```
somniacos/
├── apps/
│   ├── web/        Next.js 15 (App Router) dApp + API routes
│   ├── runtime/    Persistent autonomous agent loop (observe→broadcast)
│   ├── indexer/    Somnia event indexer scaffold
│   └── api/        Shared API surface descriptor
├── packages/
│   ├── contracts/  Foundry workspace (SomniacOS.sol + SomniacOSKernel.sol)
│   ├── shared/     Seeded economy & domain model (used by API + UI)
│   ├── agents/     Agent policy primitives
│   ├── config/     Env helpers + deployment artifacts
│   ├── db/         Postgres schema (pgvector for memory)
│   └── ui/         Shared UI primitives placeholder
├── scripts/        Deployment, seeding, and healthcheck CLI utilities
├── docs/           Technical documentation (you are here)
├── .github/        CI: pnpm build + forge test
├── vercel.json     Frontend deployment target
└── AGENT.MD        Full agent handoff log (latest project context)
```

## Quickstart

Requires **Node 22+**, **pnpm 9+**, and (for contract work) **Foundry**.

```bash
# 1. Install
pnpm install

# 2. Copy env template and fill secrets (Somnia RPC is public by default)
cp .env.example .env.local

# 3. Run the dApp on http://localhost:3000
pnpm dev

# Other workspace scripts
pnpm build                    # production build (apps/web)
pnpm typecheck                # all packages
pnpm lint                     # apps/web
pnpm runtime                  # autonomous agent loop tick
pnpm indexer                  # describe indexer plan (sanity-check)
pnpm seed                     # local seeded economy preview
pnpm seed:onchain             # generate real Somnia activity (needs PRIVATE_KEY + funded wallet)
pnpm healthcheck              # ping configured RPC + contracts
pnpm contracts:test           # forge test in packages/contracts
pnpm contracts:deploy         # deploy core economy contracts
pnpm contracts:deploy:os      # deploy the agentic OS kernel
```

## Environment Variables

`.env.example` is the source of truth. The keys fall into three groups:

**Frontend (must be `NEXT_PUBLIC_*` so Next.js inlines at build):**

| Key | Purpose | Required |
|-----|---------|----------|
| `NEXT_PUBLIC_APP_URL` | Canonical dApp URL | Yes |
| `NEXT_PUBLIC_CHAIN_NAME` | Display label | Yes |
| `NEXT_PUBLIC_CHAIN_ID` | Somnia Shannon = `50312` | Yes |
| `NEXT_PUBLIC_RPC_URL` | `https://dream-rpc.somnia.network/` | Yes |
| `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS` … `NEXT_PUBLIC_WORLD_EVENT_REGISTRY_ADDRESS` | Core economy contract addresses | Yes |
| `NEXT_PUBLIC_PROTOCOL_FEE_VAULT` … `NEXT_PUBLIC_SOMNIAC_AGENT_ROUTER_V2` | OS kernel contract addresses (defaulted in `apps/web/lib/contracts.ts`) | Optional override |
| `NEXT_PUBLIC_ENABLE_OS_KERNEL` | Set `false` to hide OS surfaces | Optional |

**Server-only secrets (never `NEXT_PUBLIC_*`):**

| Key | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | Preferred LLM provider for `/api/agents/run`. When absent, the route falls back to `text.pollinations.ai`, then a deterministic local responder. |
| `OPENAI_MODEL` | Model id (default `gpt-4o-mini`). |
| `PRIVATE_KEY` | Used by `scripts/deploy-*.ts` and `scripts/seed-onchain-activity.ts`. **Never commit.** |
| `SOMNIA_RPC_URL` | Server-side RPC (defaults to the public RPC). |
| `DATABASE_URL` | Postgres + pgvector for the indexer and `packages/db/schema.sql`. |
| `REDIS_URL` | Cache / queue for the runtime worker. |
| `VECTOR_DATABASE_URL` | Optional dedicated vector store. |
| `GITHUB_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | CI / deployment automation. |

## Live Routes

Frontend (Next.js App Router, under `apps/web/app`):

| Path | Renders | Notes |
|------|---------|-------|
| `/` | Landing page | Live proof card reads metrics from contracts |
| `/app` → `/app/agent-workbench` | Permanent redirect | |
| `/app/agent-workbench` | Mission-driven specialist agent runner | One signed transaction per run |
| `/app/agents` | Curated agent catalog | From `lib/agent-engine.ts` |
| `/app/revenue` | Protocol fee dashboard | Direct `ProtocolFeeVault` read |

Every other historical route under `/app/*` returns a `redirect()` to `/app/agent-workbench`. They remain in the tree so old URLs do not 404. See `docs/pages.md` for the full route map.

JSON APIs (`apps/web/app/api/*`):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents/run` | POST | Executes a curated agent. Accepts `{ agentId, task, constraints, urls[], missionId, outputFormat, memory, requestId, txHash }`. Returns the result plus `nextActions`, `handoffs`, `memoryUpdates`, and a `source` provenance label. |
| `/api/onchain/activity` | GET | Returns up to N decoded contract events from Somnia Shannon plus the latest block number. |
| `/api/onchain/receipt?hash=0x…` | GET | Direct `eth_getTransactionReceipt` proxy. |
| `/api/os/processes` | GET | OS process index. Prefers a direct `ProcessManager` read, falls back to event reconstruction. |
| `/api/os/processes/[id]` | GET | Single process detail. |
| `/api/os/capabilities` | GET | `CapabilityRegistry` listing with per-capability mode and agent id. |
| `/api/os/revenue` | GET | Combined event-derived + direct `ProtocolFeeVault` read. |
| `/api/world` | GET | Seeded world event sample. |
| `/api/economy` | GET | Seeded economy snapshot used by SSR fallbacks. |

Full request/response shapes are documented in [`docs/api.md`](docs/api.md).

## Onchain Surface

All contracts are deployed on **Somnia Shannon Testnet** by `0xEd9EDd8586b20524CafA4F568413C504C9B03172`.

### Core economy (`packages/contracts/src/SomniacOS.sol`)

| Contract | Address |
|----------|---------|
| AgentRegistry | `0x45119A32ca6C4d67424401dA92Abe4EC6c83f8Ce` |
| OrganizationRegistry | `0xB0DBC829dF852Ea96C14A7D06cE8D773B1F8892b` |
| Marketplace | `0x6855B0D90f618885d056F898b14AEa513D633048` |
| NegotiationRegistry | `0x6f20e728a36c710ba7ECe9b3378Cb14A69eE0b1B` |
| Escrow | `0x191B0d8E70b7866e834821D8DB2bC37780767538` |
| Reputation | `0x2Da12543C8389C4C70Ae5560c57830bE0C84B2C9` |
| SubscriptionManager | `0x6Eea20692c0f1E0B3400b71a849c4DFAa169E14D` |
| Treasury | `0x3C1F34D1f93793Cc07747BE639A472C1e14f3f5f` |
| Governance | `0x389cB8A4C506A68b8d1757de12A310C6efd981f9` |
| PartnershipRegistry | `0x20e312df00BffD3A4270e4efa0d396d2d0AFE603` |
| WorldEventRegistry | `0x4Fe350F97542911DDc95ceb09510f61de05068d9` |
| SomniacAgentRouter (v1) | `0xb7efE12dBd93DAEDe894A9237aaBd67839A3f09B` |

### Agentic OS kernel (`packages/contracts/src/SomniacOSKernel.sol`)

| Contract | Address |
|----------|---------|
| ProtocolFeeVault | `0xfd74c336792dd54862e6694bb76ff865aac06cf0` |
| CapabilityRegistry | `0xbf5163d30a914d907be2fb9973940668e404127e` |
| AutonomyPolicyRegistry | `0x36f5e0b1d305255eeca1b39583239fdac59c3318` |
| MemoryLedger | `0x051c953d7a28a0f6d1738f238ad4bea3454312a8` |
| ProcessManager | `0xa345c95ce5d3b5b2e12d6cee31b1289865b7456a` |
| SomniacAgentRouterV2 | `0xe426357cc73f67efa9bc5741b4875a6a52a55c99` |

### Somnia Agents platform (external)

| Reference | Value |
|-----------|-------|
| Platform | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` |
| LLM Inference agent id | `12847293847561029384` |
| Website Parser agent id | `12875401142070969085` |
| JSON API agent id | `13174292974160097713` |

Function selectors, ABIs, and event shapes are listed in [`docs/contracts.md`](docs/contracts.md) and mirrored in TypeScript in `apps/web/lib/contracts.ts`.

## The Agentic OS Kernel

The OS kernel adds an autonomy and accounting layer on top of the core economy. Its essential property is the **one-transaction workflow**: a wallet signs a single call to `SomniacAgentRouterV2.launchWorkflowAgentRun` and the contract atomically:

1. Creates an `AutonomyPolicy` describing max spend, max steps, allowed capabilities, and allowed domains.
2. Creates a `Process` (the OS unit of work) owned by the signer.
3. Pays the `0.1 STT` protocol fee into the `ProtocolFeeVault`.
4. Deposits the Somnia Agents request fee and calls the platform with the chosen capability mode (`LLM`, `Website`, or `JSON`).
5. Registers a `Step` row referencing the resulting `requestId`.

When the Somnia Agents platform callbacks `handleResponse`, the router resolves the step, updates the process, writes a `MemoryWritten` event, and emits `OSAgentRunCompleted`. The frontend tails these events to display per-process proof timelines without needing offchain coordination.

The full lifecycle (events, state machine, ABI), as well as deposit math (`getTotalDue = platformDeposit + pricePerAgent × subcommitteeSize + protocolFee`), is documented in [`docs/os-workflow.md`](docs/os-workflow.md).

## Tooling, Scripts and CI

- `scripts/deploy-contracts.ts` — deploys the legacy core economy bundle.
- `scripts/deploy-os-kernel.ts` — deploys the kernel and wires it: `setRouter`, `setWorkflowCreator`, then seeds eight default capabilities (`content.write`, `marketing.strategy`, `research.web`, `research.api`, `audit.code`, `treasury.plan`, `governance.draft`, `security.monitor`).
- `scripts/seed-onchain-activity.ts` — generates real Somnia transactions across every contract surface for proof-trail testing.
- `scripts/healthcheck.ts` — verifies RPC reachability + contract presence.
- `.github/workflows/ci.yml` — runs `pnpm install && pnpm build` on Node 22, then `forge build && forge test` in `packages/contracts`.

## Deeper Documentation

| File | Purpose |
|------|---------|
| [`docs/architecture.md`](docs/architecture.md) | System diagram, request lifecycle, data flow |
| [`docs/contracts.md`](docs/contracts.md) | Per-contract ABI, events, invariants, security notes |
| [`docs/api.md`](docs/api.md) | HTTP API reference for `apps/web/app/api/*` |
| [`docs/os-workflow.md`](docs/os-workflow.md) | Agentic OS kernel: lifecycle, fee math, callback security |
| [`docs/runtime.md`](docs/runtime.md) | Persistent agent loop + indexer + Postgres schema |
| [`docs/development.md`](docs/development.md) | Local setup, common workflows, debugging |
| [`docs/deployment.md`](docs/deployment.md) | Vercel + persistent worker hosting |
| [`docs/contracts-deployed.md`](docs/contracts-deployed.md) | Deployed address catalog |
| [`docs/agentic-os-branch.md`](docs/agentic-os-branch.md) | Feature-branch notes for the OS kernel rollout |
| [`docs/pages.md`](docs/pages.md) | Frontend route map (live + redirected) |
| [`docs/concept.md`](docs/concept.md) | The civilization-layer thesis (do not dilute) |
| [`docs/implementation-checklist.md`](docs/implementation-checklist.md) | Acceptance checklist |
| [`docs/github-vercel-commands.md`](docs/github-vercel-commands.md) | Operator runbook |
| [`AGENT.MD`](AGENT.MD) | Latest agent handoff log with verified onchain reads |

## Product Rules

These are hard rules. Code that violates them is rejected.

- Do not fake economic state. No fake wallets, balances, transaction hashes, agent earnings, timestamps, or "live" counts.
- Read state from Somnia contract events, transaction receipts, connected wallet state, or direct user input.
- Visitor interaction is wallet-only. No public server hot wallet that signs visitor-triggered transactions.
- Seeded onchain history is acceptable because it is real activity from deployed contracts.
- All implementation must add to the concept in `docs/concept.md`, not remove from it.

## Contributing

Before opening a PR:

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm --filter @somniacos/contracts test   # forge test
```

For frontend changes, manually verify the golden path in a browser: connect wallet → switch network → run an agent → wait for callback → see the decoded result in the Anchored Results panel.

Never commit `.env`, `.env.local`, `.env.vercel.local`, private keys, GitHub tokens, or Vercel tokens. Deployment secrets live only in Vercel / `buildenv/.env`.
