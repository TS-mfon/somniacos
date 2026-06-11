# SomniacOS — Agent Economy, Phase 2 (Plan 2)

> Historical predecessor. The active source of truth is the [2026-06-11 full-build master plan](./2026-06-11-agent-economy-full-build-master.md).

**Date:** 2026-06-11
**Status:** Planned (not started)
**Predecessor:** `docs/superpowers/plans/2026-06-09-agent-economy-mvp-phase-1.md` (Phase 1 — verified working)
**Target:** Somnia Shannon Testnet (chain 50312) · Somnia Agents Platform `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`

---

## Context — why this plan exists

Phase 1 proved the one thing most Agentathon submissions can't get working: the **two-transaction LLM callback round-trip** on the real Somnia Agents Platform. Our dispatcher submits an inference via `createRequest` and the platform calls `handleAgentResponse` back into our contract, which decodes the validator result and routes it to a module resolver — verified end-to-end (requestId `5897647`, `draft()` resolved, treasury collected exactly 0.1 STT). One competing submission (**AgentPay**) is *publicly stuck on this exact step* — "inference succeeds, callback never arrives."

The weakness today: the product reads as a broad "agent OS" with a single content skill (`draft`). It doesn't yet *feel* agent-focused — agents don't get hired, paid, judged, or build trust, and nothing touches the outside world or moves money.

Phase 2 fixes that by shipping **three flagship products on one shared, verified callback rail**, each turning the LLM into an on-chain authority over real value:

1. **Autonomous Work Escrow (A2A)** — agents get hired, deliver, and the chain itself rules PASS/FAIL/SPLIT and pays out. (Beats AgentPay head-to-head.)
2. **Sentinel — Ethereum Token Signal Agent** — scans real ETH-token data and publishes a BUY…AVOID signal with on-chain reasoning. (Aionis/compliance lane, signals-only for now.)
3. **Oracle Court** — plain-English conditions and work disputes settled by an LLM judge, escrow paid out on-chain. (Disputes/oracle lane.)

Everything reuses the verified dispatcher + identity + treasury + the frontend wallet/gas/notify stack. No human arbiter, no backend, no hot wallet.

### Hard technical truths this plan is built on (verified during planning)
- ✅ **`dispatch()` is generic and works** — `AgentEconomyDispatcher.dispatch(agentId, prompt, system, resolveSelector, context, initiator)` payable → `handleAgentResponse` → `module.resolveSelector(requestId, bytes(text), context)`. **No dispatcher change is required** for any flagship. (`packages/contracts/src/agents/AgentEconomyDispatcher.sol`)
- ✅ **LLM inference (`inferString`) is the only verified primitive.** `WEB_AGENT_ID` / `JSON_AGENT_ID` exist in `PlatformAdapter.sol` but are **declared, never wired, never verified.** → Real-world data comes from the **frontend fetch + on-chain provenance hash** by default; the on-chain Web agent is a stretch spike only.
- ✅ The callback uses **`responses[0]` only** (first validator), not subcommittee consensus. → Single-judge MVP. Multi-judge "panel" is a stretch.
- ⚠️ **Somnia gas quirk:** forge estimates are too low; deploy every contract with explicit high gas limits (dispatcher needed ~18.1M; we deploy at 25M via `cast send`). `gasUsed == gasLimit` ⇒ out-of-gas.
- ⚠️ **LLM output is text.** Reuse the proven prefix-parse pattern (`APPROVE:` / `DENY:` in `AgentIdentity`) for verdicts; resolvers must never revert (dispatcher already wraps resolver calls in a low-level call).

---

## Vision / pitch (for the README + demo)

> Imagine you're an AI agent on Somnia. You need to **get hired**, **get paid when you deliver — and only then**, **defend yourself when accused**, **read the world**, and **build a reputation** that makes others choose you. SomniacOS is the operating system for that life. Every action is wallet-signed, every judgment is rendered by the Somnia LLM and written immutably on-chain. The inference engine is the law.

---

## Architecture overview

```
                         ┌─────────────────────────────────────┐
   wallet sign  ───────▶ │  Flagship module (Work/Sentinel/Court)│
                         │   - locks/holds STT (embedded escrow) │
                         │   - builds prompt + system + context  │
                         └───────────────┬─────────────────────┘
                                         │ dispatch{value: requiredDeposit}()
                                         ▼
                         ┌─────────────────────────────────────┐
                         │  AgentEconomyDispatcher (VERIFIED)   │
                         │   createRequest → platform           │
                         └───────────────┬─────────────────────┘
                                         │ (platform validators run inferString)
                                         ▼  handleAgentResponse(responses,…)
                         ┌─────────────────────────────────────┐
                         │  module.resolve*(requestId, text, ctx)│
                         │   - parse verdict + reasoning        │
                         │   - settle escrow (release/refund/split)
                         │   - AgentIdentity.adjustReputation    │
                         │   - emit *Resolved / *Published       │
                         └─────────────────────────────────────┘
```

**Shared, already built (reuse as-is):**
- `AgentEconomyDispatcher.sol` — callback rail. **Reuse the deployed instance unchanged.**
- `PlatformAdapter.sol` — agent-id constants, deposit helpers.
- `ProtocolTreasury.sol` — protocol fee sink.
- `core/AgentIdentity.sol` — registration + `reputationScore` (extended in W0).
- `skills/SkillRouter.sol`, `skills/ContentCodeSkills.sol` — keep `draft` as a showcase "skill."
- Frontend: `apps/web/lib/somnia-gas.ts` (bufferedGas/detectWalletKind/estimateGasFees/gasCeiling/pickPricingForWallet/pricingArgs), `apps/web/lib/contracts.ts` (`somnia` chain), `components/wallet-button.tsx` (`useSomniaWallet`), `components/notification-center.tsx` (`useNotifications`/`BellButton`), `components/agents/skills-client.tsx` & `register-client.tsx` (dispatch + poll patterns), `lib/agents/dispatcher.ts` (`waitForDraftResult` polling pattern).

**New shared primitives (W0):**
- `agents/lib/EscrowLib.sol` — internal library: status machine + split math over a `Slot` struct held *inside each module* (no cross-contract fund hops → less gas, dodges the gas quirk).
- `AgentIdentity` additions: `authorizedModules`, `adjustReputation(agent, delta, reason)`, `recordEarning(agent, amount)`.

---

## The three flagships — contract interfaces

### Flagship 1 — `skills/WorkEscrow.sol` (Marketplace + Work Verification + AgentPay + Escrow + Reputation)

```solidity
enum JobStatus { Open, Claimed, Delivered, Verifying, Passed, Failed, Split, Cancelled }

struct Job {
    address client; address worker;
    string  title; string brief; string criteria;   // English acceptance criteria
    uint256 reward; uint256 verifyDeposit;           // held STT
    uint64  deadline;                                // block number
    bool    agentsOnly;
    JobStatus status;
    string  evidenceURI; string evidenceText;        // deliverable
    uint8   verdict; uint16 score; string ruling;    // from LLM
    uint256 verifyRequestId; uint256 parentJobId;    // A2A subcontract link
}

postJob(title, brief, criteria, deadlineBlocks, agentsOnly) payable -> jobId
    // value = reward + verifyDeposit (+ protocolFee). Escrow locked in-contract.
claimJob(jobId)                       // worker = msg.sender; must be a registered agent if agentsOnly
submitDelivery(jobId, evidenceURI, evidenceText)        // only worker, Claimed -> Delivered
requestVerification(jobId)            // ANYONE (keeper-friendly); spends held verifyDeposit to dispatch the LLM judge
resolveVerification(requestId, result, context)         // dispatcher resolver: parse "PASS|FAIL|SPLIT <bps>: reason"
                                      //   PASS  -> release reward to worker, +rep, recordEarning
                                      //   FAIL  -> refund client, -rep
                                      //   SPLIT -> EscrowLib.split(bps), small +rep
cancelExpired(jobId)                  // past deadline w/ no delivery -> refund client
appealToCourt(jobId)                  // Failed/Split -> opens an OracleCourt case (ties flagships together)
```
**Judge prompt:** `system = "You are an impartial work verifier. Decide only from the brief, the acceptance criteria, and the submitted evidence."`; `prompt = criteria + "\n\nBRIEF:\n" + brief + "\n\nEVIDENCE:\n" + evidenceText + " (" + evidenceURI + ")"`; require output `PASS: <reason>` / `FAIL: <reason>` / `SPLIT <bps>: <reason>`. Parser mirrors `AgentIdentity._resolveRegistration`.
**A2A:** a worker agent may itself `postJob` a sub-task funded from its expected reward (`parentJobId` link) — agents hiring agents.

### Flagship 2 — `skills/SentinelSignals.sol` (Ethereum token scanner → on-chain signal)

```solidity
enum Verdict { BUY, ACCUMULATE, HOLD, REDUCE, AVOID }

struct Signal {
    address requester; string token; bytes32 dataHash;   // keccak of the data snapshot = provenance
    Verdict verdict; uint16 confidence; string reasoning;
    uint64  timestamp; uint256 requestId;
}

requestSignal(token, dataSnapshot) payable -> requestId
    // value = requiredDeposit (+protocolFee). Commits keccak256(dataSnapshot) as dataHash.
resolveSignal(requestId, result, context)   // parse "VERDICT: <enum> | CONFIDENCE: 0-100 | REASON: ..."
latestSignal(token) view; signalLog(i) view // public feed

// Autonomy (keeper):
addToWatchlist(token) payable               // top up per-user scan credit
scanWatchlist(user, token)                  // keeper-callable; pulls credit; requestSignal
```
**Signal prompt:** `system = "You are a crypto risk analyst. From the supplied on-chain + market data for an Ethereum token, output a single trading signal and a short justification. Never invent data."`; `prompt` embeds the snapshot JSON; require `VERDICT: BUY|ACCUMULATE|HOLD|REDUCE|AVOID\nCONFIDENCE: <0-100>\nREASON: <text>`.
**Data ingestion (default, reliable):** frontend fetches and assembles a snapshot from public APIs — Dexscreener (price/liquidity/volume/FDV), GoPlus Security (honeypot/owner/tax/blacklist flags), Etherscan (verified source / age) — then passes `dataSnapshot` into `requestSignal` and the contract commits its hash so the signal is provably tied to that input. **Stretch:** wire `WEB_AGENT_ID` to fetch on-chain.

### Flagship 3 — `skills/OracleCourt.sol` (parametric settlement + disputes)

```solidity
enum CaseStatus { Open, Joined, EvidenceIn, Ruling, Ruled }
enum Ruling { PENDING, PLAINTIFF, DEFENDANT, SPLIT }

struct Case {
    address plaintiff; address defendant;
    string  question; string criteria;
    uint256 stakeP; uint256 stakeD;
    string  evidenceP; string evidenceD;
    CaseStatus status; Ruling verdict; string rationale;
    uint256 rulingRequestId; uint256 linkedJobId;   // appeal source, if any
}

openCase(defendant, question, criteria) payable -> caseId   // plaintiff stakes
joinCase(caseId) payable                                    // defendant matches stake
submitEvidence(caseId, evidence)                            // each side once
requestRuling(caseId) payable                               // dispatch LLM with question+criteria+both evidences
resolveRuling(requestId, result, context)                  // parse "PLAINTIFF|DEFENDANT|SPLIT <bps>: reason"; settle both stakes; adjust both reputations
```
**Stretch — "Court panel":** loop N dispatches and take majority (needs the dispatcher's `responses[0]` limitation worked around; out of MVP scope).

### `core/AgentIdentity.sol` additions (W0)
```solidity
mapping(address => bool) public authorizedModules;
function setModule(address m, bool ok) external onlyOwner;
function adjustReputation(address agent, int256 delta, string calldata reason) external; // onlyAuthorizedModule; clamp 0..1000; emit ReputationChanged
function recordEarning(address agent, uint256 amount) external;                          // onlyAuthorizedModule; bump totalEarned
```

---

## Frontend — a dedicated Agent Economy surface

The Phase-1 complaint was that the agent pages bled into the human dapp chrome. Phase 2 gives the economy its **own shell + nav**, separate from the human dapp.

- **New layout/route group:** `apps/web/app/economy/layout.tsx` + `components/economy/economy-shell.tsx` — its own top bar and nav (`Identity · Work · Sentinel · Court · Activity`), reusing `WalletButton` + `BellButton` + design tokens (`panel`, `signal`) but NOT the human `navItems`.
- **Routes:**
  - `app/economy/page.tsx` — hub: the three flagships + identity + live activity.
  - `app/economy/identity/page.tsx` — register (reuse `register-client.tsx`) + reputation card.
  - `app/economy/work/page.tsx` — job board + post-job + job detail (claim/deliver/verify timeline, live verdict + reasoning).
  - `app/economy/sentinel/page.tsx` — token scanner (fetch live data → "Get Signal" → on-chain verdict), watchlist, signal feed.
  - `app/economy/court/page.tsx` — case board + open-case + case detail (evidence + ruling).
  - `app/economy/activity/page.tsx` — global feed of dispatches/verdicts/signals/settlements (view-function polling; extends `LiveMetrics`).
- **Re-enable the Human/Agent entry** (the `EnterModal` popup we hid) pointing the Agent door at `/economy`.
- **New libs:** `lib/agents/work.ts`, `lib/agents/sentinel.ts`, `lib/agents/court.ts` (ABIs + a generic `waitForResolved(view,key)` refactored from `waitForDraftResult`), `lib/agents/token-data.ts` (Dexscreener/GoPlus/Etherscan fetch + snapshot + hash), extend `lib/agents/contracts.ts` with the new addresses.
- **New components:** `components/economy/{work-board,post-job,job-detail,sentinel-client,court-client,reputation-card,activity-feed}.tsx`. All reuse `useSomniaWallet`, `useNotifications`, and the `somnia-gas` helpers (same dispatch+poll flow as `skills-client.tsx`).

### Autonomy / keeper (non-custodial)
`scripts/keeper.ts` — a standalone node script anyone can run: periodically `scanWatchlist` (Sentinel), `cancelExpired` (Work), and `requestVerification` for delivered jobs past a grace window. It calls only public functions and spends held deposits — no custody of user funds. This is the "agent acts on its own; you can pull the plug" story (echoes Aionis), without needing a native chain scheduler (which Somnia doesn't expose).

---

## Task breakdown (≈40 tasks, by workstream)

### W0 — Shared foundation
1. `EscrowLib.sol`: `Slot` struct + status machine (`lock/markReleased/markRefunded/markSplit`) + `splitAmounts(amount,bps)`; unit-tested pure logic.
2. `AgentIdentity`: add `authorizedModules`, `setModule`, `adjustReputation` (clamp 0..1000, emit `ReputationChanged`), `recordEarning`.
3. Confirm **dispatcher is reused unchanged**; document `requiredDeposit()` + protocol-fee math each module must forward.
4. Define a shared text-verdict parser pattern (library or per-module) mirroring `AgentIdentity` APPROVE/DENY; fallback path on parse failure (SPLIT/HOLD), resolver never reverts.

### W1 — Flagship 1: Work Escrow
5. `WorkEscrow.sol` storage + `postJob` (lock reward + verifyDeposit).
6. `claimJob` (agentsOnly gate via `AgentIdentity.agents(worker).active`).
7. `submitDelivery`.
8. `requestVerification` → `dispatch` LLM judge with criteria+evidence; store `verifyRequestId`.
9. `resolveVerification` → parse verdict, settle escrow via `EscrowLib`, `adjustReputation`/`recordEarning`, emit `JobResolved`.
10. `cancelExpired` + `appealToCourt` (links to OracleCourt).
11. A2A subcontract path (`parentJobId`) + events for the activity feed.
12. Foundry tests with a mock platform that calls back `handleAgentResponse` with canned PASS/FAIL/SPLIT.

### W2 — Flagship 2: Sentinel
13. `SentinelSignals.sol` storage + `requestSignal` (commit `dataHash`, dispatch).
14. `resolveSignal` parser (`VERDICT|CONFIDENCE|REASON`) + `Signal` store + `SignalPublished` event.
15. `latestSignal`/`signalLog` views for the feed.
16. Watchlist + `scanWatchlist` (keeper) + per-user scan credit accounting.
17. `lib/agents/token-data.ts`: Dexscreener + GoPlus + Etherscan fetch → snapshot JSON + keccak hash (client-side).
18. Foundry tests (mock callback → each verdict; bad-format → safe fallback).
19. **Stretch spike:** attempt `WEB_AGENT_ID` on-chain fetch; document signature/result; fall back to frontend-fetch if unverified.

### W3 — Flagship 3: Oracle Court
20. `OracleCourt.sol` storage + `openCase`/`joinCase` (dual stake escrow).
21. `submitEvidence` (one per side) + state machine.
22. `requestRuling` → dispatch LLM judge.
23. `resolveRuling` → parse, settle both stakes, adjust both reputations, emit `CaseRuled`.
24. WorkEscrow `appealToCourt` → `OracleCourt.openCase` integration test.
25. Foundry tests (PLAINTIFF/DEFENDANT/SPLIT; appeal flow).

### W4 — Deployment & wiring
26. `script/DeployAgentEconomyV2.s.sol` (or cast runbook): deploy `EscrowLib`, redeploy `AgentIdentity` (with rep hooks), deploy `WorkEscrow`/`SentinelSignals`/`OracleCourt`; **reuse existing dispatcher + treasury**.
27. `AgentIdentity.setModule(...)` for all three modules; set treasury/fees per module.
28. Deploy via `cast send --gas-limit 25000000` (Somnia gas quirk); capture addresses.
29. Update `apps/web/lib/agents/contracts.ts` (+ `getAddress` checksums) and `apps/web/.env.local`.
30. On-chain end-to-end smoke per module via `cast` (post→claim→deliver→verify→PASS pays worker; scan→signal; open→rule→settle).

### W5 — Frontend
31. `economy/layout.tsx` + `economy-shell.tsx` (own nav, separate from human chrome).
32. `economy/page.tsx` hub + re-enable `EnterModal` Agent door → `/economy`.
33. `economy/identity` (reuse `register-client`) + `reputation-card.tsx` (reads `agents()` + `ReputationChanged`).
34. `lib/agents/work.ts` + `work-board.tsx` + `post-job.tsx` + `job-detail.tsx` (dispatch + poll + live verdict).
35. `lib/agents/sentinel.ts` + `sentinel-client.tsx` (token data fetch → signal → reasoning + history).
36. `lib/agents/court.ts` + `court-client.tsx` (case lifecycle + ruling).
37. `activity-feed.tsx` global feed (view polling) + extend `LiveMetrics`.

### W6 — Autonomy, polish, ship
38. `scripts/keeper.ts` (scan watchlist / finalize expired / trigger verification) + README on running it non-custodially.
39. Typecheck + production build + route smoke (200s) + `pnpm contracts:test`.
40. Push, redeploy to Vercel (token in `buildenv/.env`), record the demo video (script below).

---

## Verification plan (end-to-end)

- **Contracts:** `pnpm --filter @somniacos/contracts test` — each module's resolver tested against a mock platform that invokes `handleAgentResponse` with canned validator results (the proven Phase-1 pattern).
- **On Somnia (cast):**
  - Work: `postJob` → `claimJob` (2nd wallet) → `submitDelivery` → `requestVerification` → confirm `JobResolved`, worker balance up on PASS, reputation bumped.
  - Sentinel: build a snapshot for a real ETH token, `requestSignal`, confirm `SignalPublished` with a parsed verdict + reasoning.
  - Court: `openCase`/`joinCase`/`submitEvidence` ×2/`requestRuling` → confirm `CaseRuled` + stakes settled.
- **Frontend:** typecheck clean, `pnpm build` 50+/50 pages, each `/economy/*` route HTTP 200, one full live click-through per flagship with a connected wallet.
- **Prod:** redeploy to Vercel; smoke the live URLs.

## Demo script (video)
1. Register an agent identity (LLM validator approves on-chain).
2. Post a job → a second wallet (the "agent") claims + delivers → the chain judges PASS and **pays the worker**; show the on-chain reasoning + reputation bump. *(“AgentPay is still debugging callbacks — ours pays out live.”)*
3. Sentinel scans a real Ethereum token → BUY/AVOID signal **with reasoning**, provenance hash on-chain.
4. A disputed job → Oracle Court rules and settles the stakes.
Close: *every decision is provable on Somnia, rendered by the LLM, with no human judge and no backend.*

## Risks & mitigations
- **Web agent unverified** → frontend-fetch + on-chain provenance hash by default; Web agent is a stretch spike (W2.19), never on the critical path.
- **Somnia gas quirk** → 25M `cast` deploys; embedded escrow (no cross-contract fund hops) keeps module gas bounded.
- **LLM verdict nondeterminism** → constrained output format + robust prefix parser + safe fallback (SPLIT/HOLD); resolver never reverts.
- **Single-validator callback (`responses[0]`)** → single-judge MVP; "Court panel" multi-judge explicitly deferred.
- **AgentIdentity redeploy resets registrations** → acceptable on testnet; re-register demo agents.

## Out of scope (Plans 3–5)
A2A negotiation room, insurance/coalitions, subscription/payroll automation, multi-judge Court consensus, on-chain Web-agent data ingestion, and the remaining breadth skills from `plan.md`.
