# SomniacOS Architecture

This document is the technical reference for how SomniacOS components fit together. It is the file to read before changing any cross-cutting behavior.

## 1. Goals and Non-Goals

**Goals**

- Make every visitor-visible piece of state provably derivable from Somnia Shannon Testnet (chain id `50312`) — events, transaction receipts, contract reads, or the connected wallet.
- Run a one-transaction onboarding for autonomous agent work: a single wallet signature creates a policy, creates a process, pays the protocol fee, deposits the Somnia Agents fee, and queues the agent request.
- Keep the Vercel frontend stateless. All persistent state lives onchain, in Postgres, or in the user's wallet/local storage.

**Non-goals**

- Custodial wallets. There is no server hot wallet for visitor-triggered transactions.
- Off-chain agent revenue accounting. All fees route through `ProtocolFeeVault` and `Treasury` contracts.
- Synchronous LLM responses on the chain. Everything routed through Somnia Agents is asynchronous and proven by callback.

## 2. Process Boundary Map

| Process | Hosting | Lifetime | Trust boundary |
|---------|---------|----------|----------------|
| `apps/web` (Next.js 15) | Vercel serverless | per-request | Public; server routes use server-only env vars (`OPENAI_API_KEY`) and a server `viem` `publicClient`. |
| Somnia Shannon node | `https://dream-rpc.somnia.network/` | persistent | Public; no auth required for reads. |
| Somnia Agents platform | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` | persistent | Trusted callback origin — `SomniacAgentRouter*` checks `msg.sender == platform`. |
| LLM provider | `api.openai.com` (preferred), `text.pollinations.ai` (fallback) | per-request | Out-of-protocol; results are not anchored automatically. |
| `apps/runtime` | external persistent host (planned) | always-on | Optional; emits world events. |
| `apps/indexer` | external persistent host (planned) | always-on | Optional; writes `indexed_contract_events`. |
| Postgres + pgvector | external persistent host (planned) | always-on | Optional. Schema: `packages/db/schema.sql`. |

Vercel was chosen for the frontend specifically because serverless suits the request/response surface. The runtime + indexer are kept out because they need persistent connections and would silently die on serverless cold-start boundaries.

## 3. Request Lifecycles

### 3.1 Workbench agent run (visitor golden path)

```
Browser                       Wallet                Somnia Shannon                 Somnia Agents              LLM provider
   │                            │                         │                              │                          │
   │  Pick agent + fill task    │                         │                              │                          │
   │  POST /api/agents/run      │                         │                              │                          │
   │ ─────────────────────────────────────────────────────│                              │                          │
   │  (server LLM result)                                 │                              │  fetch system+user       │
   │ <─────────────────────────────────────────────────── │ ─────────────────────────────────────────────────────── │
   │  Sign launchWorkflowAgentRun                         │                              │                          │
   │ ─────────────────────────▶│ eth_sendTransaction ────▶│ createPolicy / createProcess │                          │
   │                            │                         │ payFee 0.1 STT               │                          │
   │                            │                         │ platform.createRequest ─────▶│ schedule subcommittee    │
   │                            │                         │ registerStep                 │                          │
   │                            │                         │ OSAgentRunRequested event ──▶│                          │
   │  poll receipt + tail logs  │                         │                              │                          │
   │ ◀───────────────────────── │                         │                              │                          │
   │                            │                         │ handleResponse (cb) ◀────────│ subcommittee finishes    │
   │                            │                         │ completeStepFromRouter       │                          │
   │                            │                         │ OSAgentRunCompleted event    │                          │
   │  Anchored result render    │                         │                              │                          │
```

Notes:

- `/api/agents/run` runs concurrently with the wallet signature. The UI shows the LLM result immediately and replaces it with the onchain callback result once `OSAgentRunCompleted` is observed.
- The router refunds excess `msg.value` to the caller after taking `deposit + protocolFee` (see `SomniacAgentRouterV2.launchWorkflowAgentRun`).
- Gas is explicitly estimated client-side and submitted with a buffer to avoid the "Gas limit too low" wallet error.

### 3.2 Server-only contract reads

`apps/web/lib/server-onchain.ts` instantiates a viem `publicClient` against `SOMNIA_RPC_URL || NEXT_PUBLIC_RPC_URL`. It decodes a known list of events (`AgentCreated`, `OrganizationCreated`, `TaskPosted`, `AgentRunCompleted`, `OSAgentRunCompleted`, `ProtocolFeePaid`, etc.) for `/api/onchain/activity` and `/api/os/*`.

`apps/web/lib/server-os.ts` additionally performs direct contract reads (`ProcessManager.processes(id)`, `ProcessManager.steps(processId, stepId)`, `ProtocolFeeVault.totalCollected`) so the OS surfaces remain correct even after the event log window scrolls past recent activity. The OS endpoints emit a `source: "contract" | "events" | "defaults"` field so the UI can show provenance.

### 3.3 Agent callback path (security-critical)

`SomniacAgentRouterV2.handleResponse(uint256 requestId, Response[] responses, ResponseStatus status, Request)` is the only entry point that mutates step completion:

1. `require(msg.sender == address(platform), "only platform");`
2. `require(pendingRequests[requestId], "unknown request");`
3. `delete pendingRequests[requestId];` — single-shot.
4. Decode `responses[0].result` as `string` if non-empty; otherwise classify as `TimedOut` or `Failed`.
5. Call `processManager.completeStepFromRouter(requestId, status, result)` — which itself is gated by `onlyRouter`.

This narrow path is what guarantees that `Step.result` reflects subcommittee output and cannot be spoofed by a third party.

## 4. Data Flow Inventory

| Source of truth | Consumer | Mechanism |
|-----------------|----------|-----------|
| Somnia contract state | `apps/web` server routes | viem `publicClient.readContract` |
| Somnia contract events | `apps/web` UI + indexer | `getLogs` with topic filters; decoded via ABIs in `apps/web/lib/contracts.ts` |
| Connected wallet | `apps/web` client components | viem injected transport, signs with the user's wallet |
| Browser local storage | Workbench memory + run history | `agent-engine.ts` exports `AgentMemory` & `AgentRunRecord` shapes |
| Postgres | future indexer | `packages/db/schema.sql` |
| LLM provider | `/api/agents/run` | OpenAI Responses API; falls back to Pollinations text endpoint |

## 5. Provenance Discipline

Every UI label that asserts an economic fact must reference one of: (a) a deployed contract address, (b) a decoded event topic, (c) the connected wallet's own state, or (d) explicit user input. The Workbench tags each rendered result with a `source` provenance value (`"Somnia"`, `"LLM API"`, or `"SomniacOS Local"`), which is preserved in local run history and surfaced as a proof badge.

## 6. Failure Modes and Fallbacks

| Failure | Detection | Fallback |
|---------|-----------|----------|
| OpenAI down / no key | non-2xx or missing env | Pollinations text endpoint (`text.pollinations.ai`) — `source` becomes `"LLM API"` with `provider: "pollinations"`. |
| Both LLM providers down | timeout / non-2xx | Deterministic local responder (`buildLocalAgentOutput`) — `source` becomes `"SomniacOS Local"`. |
| Somnia RPC timeout | viem throws | Server route returns 500 with structured error; UI surfaces "Anchored results may be delayed". |
| Recent event window has scrolled past the process | `getLogs` returns 0 | `getOSProcessDirect` falls back to `ProcessManager.processes(id)` + `ProcessManager.steps(id, stepId)` reads. |
| Wallet rejects signature | viem `UserRejectedRequestError` | UI surfaces a recoverable error, leaves the form populated. |
| Insufficient STT | viem revert | UI prompts the user to fund the wallet from the Shannon faucet. |
| Subcommittee timeout | `ResponseStatus.TimedOut` | Router writes `"Somnia Agent request timed out before validators reached a result."` into `Step.result`; UI surfaces it. |

## 7. Frontend Composition

The dApp is a Next.js 15 App Router project under `apps/web/app/`:

- `app/page.tsx` — landing page (server component) with a `<LiveMetrics />` island.
- `app/layout.tsx` — global shell with the dark "command center" theme defined in `apps/web/app/globals.css` (signal-cyan accent on charcoal `#131313`).
- `app/app/` — application shell.
  - `app/app/agent-workbench/page.tsx` — mounts `<AgentWorkbench />` (`apps/web/components/agent-workbench.tsx`). The Workbench is the single live agent runner. It holds local mission history in `localStorage`.
  - `app/app/agents/page.tsx` — server-rendered catalog from `lib/agent-engine.ts` (`curatedAgents`).
  - `app/app/revenue/page.tsx` — server-renders `ProtocolFeeVault` totals.
  - All other `/app/*` pages are intentional `redirect()` stubs to `/app/agent-workbench`. They exist so previous shared URLs continue to resolve.
- `app/api/*` — Edge-incompatible Node runtime routes (`export const runtime = "nodejs"`).

## 8. Concurrency and Idempotency

- `requestId` is unique per `platform.createRequest` call. `pendingRequests[requestId]` is true between request and callback, and is `delete`'d in `handleResponse`, making callback handling single-shot.
- `Process.status` advances `Created → WaitingForCallback → Running → Completed | Failed | Cancelled`. `registerStep` only runs while status is `Created`, `Running`, or `WaitingForCallback`, and `completeProcess` requires `Running` or `WaitingForCallback`.
- `process.spent` is incremented atomically with `process.stepCount` inside `registerStep`, then checked against `policy.maxSpend` / `policy.maxSteps` before the call returns.

## 9. Extension Points

- **New capability** — call `CapabilityRegistry.registerCapability(bytes32 id, string label, string description, uint8 mode, uint256 somniaAgentId, string schemaURI)` from the owner key, then add it to `defaultCapabilities` in `apps/web/lib/os-state.ts` for offline UI fallback.
- **New curated agent** — append a `CuratedAgent` to `apps/web/lib/agent-engine.ts`. The Workbench picks it up automatically; the seeded handoff graph is keyed by `id`.
- **New event in the activity feed** — add an entry to `apps/web/lib/server-onchain.ts`'s `eventConfigs` array (contract address, ABI fragment, decoder).
- **New OS contract** — extend `osContracts` in `apps/web/lib/contracts.ts`, plus the corresponding `*Abi` constant, and append to `osContractCatalog`.

## 10. Coordinate System

| Identifier | Type | Where it is produced |
|------------|------|----------------------|
| `processId` | `uint256` (1-indexed) | `ProcessManager.createProcess` / `createProcessFor` |
| `stepId` | `uint256` (1-indexed per process) | `ProcessManager.registerStep` |
| `policyId` | `uint256` (1-indexed) | `AutonomyPolicyRegistry.createPolicy` / `createPolicyFor` |
| `requestId` | `uint256` | Somnia Agents platform (`ISomniaAgentPlatformV2.createRequest`) |
| `capabilityId` | `bytes32` | `keccak256(name)` by convention (see `scripts/deploy-os-kernel.ts`) |
| `appAgentId` | `string` | The curated agent's `id` field (`marketing-strategist`, `content-writer`, …) |
| `somniaAgentId` | `uint256` | Hard-coded LLM / Website / JSON agent ids on the Somnia Agents platform |
| `eventId` | `bytes32` | `keccak256(payload)` by convention when writing to `WorldEventRegistry` |

Cross-referencing these identifiers is how the frontend reconstructs a complete proof trail from a single onchain process.
