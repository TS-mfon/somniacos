# Development Guide

This guide is the day-to-day reference for working on SomniacOS. It complements `README.md` (high-level overview) and `docs/architecture.md` (system design).

---

## 1. Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Node.js | ≥ 22 LTS | Matches the CI matrix. Required for `next` 15 and `viem` 2. |
| pnpm | ≥ 9 | Workspaces, `--filter`, and `pnpm-lock.yaml` are pnpm-specific. |
| Foundry | latest stable | `forge build`, `forge test`, contract deployment. |
| Git | recent | Workflow assumes GitHub. |
| A Somnia Shannon-funded wallet | — | For local end-to-end testing of the Workbench. |

Optional:

- Postgres 16 + `pgvector` for the indexer + runtime.
- Redis 7 for runtime coordination.
- An OpenAI API key for higher-quality Workbench responses.

---

## 2. First-time setup

```bash
git clone https://github.com/TS-mfon/somniacos.git
cd somniacos
pnpm install
cp .env.example .env.local
# fill OPENAI_API_KEY locally if you want the OpenAI path; otherwise it falls back to Pollinations
```

Verify everything works:

```bash
pnpm run typecheck                  # all workspaces
pnpm run build                      # apps/web
pnpm --filter @somniacos/contracts test
pnpm dev                            # http://localhost:3000
```

---

## 3. Workspace cheatsheet

```bash
# Top-level scripts (from repo root)
pnpm dev                            # apps/web on port 3000
pnpm build                          # apps/web production build
pnpm lint                           # apps/web
pnpm typecheck                      # every workspace's `typecheck` script
pnpm runtime                        # one autonomous tick from apps/runtime
pnpm indexer                        # describe indexer plan from apps/indexer
pnpm seed                           # local seeded economy preview
pnpm seed:onchain                   # generate real Somnia activity (PRIVATE_KEY required)
pnpm healthcheck                    # ping configured RPC + contracts
pnpm contracts:test                 # forge test
pnpm contracts:deploy               # deploy SomniacOS.sol bundle
pnpm contracts:deploy:os            # deploy SomniacOSKernel.sol bundle and wire it

# Filter to one workspace
pnpm --filter @somniacos/web dev
pnpm --filter @somniacos/web build
pnpm --filter @somniacos/web typecheck
pnpm --filter @somniacos/contracts test
```

---

## 4. The mental model

When you add a feature, ask in order:

1. **Where does the user input come from?** Wallet, form, or URL?
2. **Where does the truth live?** Onchain (contract address + ABI), in Postgres, or in the user's browser?
3. **Which provenance label will the UI show?** `Somnia`, `LLM API`, or `SomniacOS Local`?
4. **What single transaction (or zero) does the user sign?** Never two.
5. **What event tells the UI it's done?** Subscribe to that event, not a polling loop, when possible.

Violating any of these usually means you're rebuilding existing infrastructure or breaking the no-fake-state rule.

---

## 5. Common workflows

### 5.1 Add a curated agent

1. Add a `CuratedAgent` entry in `apps/web/lib/agent-engine.ts`.
2. If the agent should be the target of a handoff, add it to `buildAgentHandoffs` / `buildNextActions`.
3. (Optional) Add a default mission in `agentMissions` for the Workbench mission preset row.
4. `pnpm typecheck && pnpm build`.

No contract changes are required — curated agents are addressed by their string `id` (`appAgentId`).

### 5.2 Add an OS capability

1. From the kernel owner key, call `CapabilityRegistry.registerCapability(keccak256("my.capability"), label, description, mode, somniaAgentId, schemaURI)`.
2. Add the same id to `defaultCapabilities` in `apps/web/lib/os-state.ts` so the UI fallback shows it before any chain read succeeds.
3. The Workbench will pick it up automatically.

### 5.3 Add a contract event to the activity feed

1. Add the event ABI fragment to the relevant `*Abi` constant in `apps/web/lib/contracts.ts`.
2. Append a decoder entry in `apps/web/lib/server-onchain.ts`'s event config array.
3. Re-run `pnpm dev` and exercise the contract via wallet — the event should appear in `/api/onchain/activity`.

### 5.4 Deploy a fresh kernel

```bash
export PRIVATE_KEY=0x…
export SOMNIA_RPC_URL=https://dream-rpc.somnia.network/
export PROTOCOL_FEE_RECIPIENT=0x…           # optional, defaults to the canonical recipient
pnpm contracts:deploy:os
```

`scripts/deploy-os-kernel.ts` writes the new addresses to `packages/config/deployments/somnia-shannon.json`. Copy them into `apps/web/lib/contracts.ts` (`osContracts`) and into your Vercel env vars before deploying.

### 5.5 Seed real onchain activity

```bash
export PRIVATE_KEY=0x…
pnpm seed:onchain
```

The seed script issues transactions against every deployed contract surface (agents, orgs, marketplace, negotiations, escrow, reputation, subscriptions, treasury, governance, partnerships, world events, OS kernel). It is safe to re-run, but each run costs gas.

---

## 6. Debugging

### Workbench produces unexpected text

1. Check the `source` badge in the rendered result.
   - `Somnia` — the Somnia Agents callback wrote it. Verify the `requestId` in the explorer.
   - `LLM API` (`provider: openai`) — OpenAI Responses returned it. Inspect with `OPENAI_API_KEY` set locally.
   - `LLM API` (`provider: pollinations`) — Pollinations fallback. Set `OPENAI_API_KEY` to escape it.
   - `SomniacOS Local` — both providers failed. Inspect `providerError` in the response payload.
2. Server logs: `apps/web/app/api/agents/run/route.ts` only logs via `Response.json({ error })`. Add a temporary `console.error` if needed.

### Process stuck in `WaitingForCallback`

1. `curl https://somniacos.vercel.app/api/os/processes/<id>` and confirm the `steps[].requestId`.
2. Inspect the request on Somnia Agents (request id → platform tx).
3. If the platform shows `TimedOut`, expect a `handleResponse(_, TimedOut, _)` callback in the next few blocks.

### Wallet rejects with "Gas limit too low"

Workbench transactions explicitly estimate gas and submit `gas = estimate * 1.2`. If you still see the error, ensure your wallet's auto-gas estimation is off — some wallets ignore the supplied gas and re-estimate.

### `/api/onchain/activity` returns empty

The route window-scopes `getLogs`. The recent-window default is small to stay under public RPC limits. Seed onchain activity with `pnpm seed:onchain` or expand the window in `apps/web/lib/server-onchain.ts`.

### Forge test failures

```bash
cd packages/contracts
forge test -vvvv          # full traces
forge test --match-test testHandleResponseOnlyPlatform -vvvv
```

Use `forge inspect <contract> abi` to verify ABI updates are consistent with the TS mirror.

---

## 7. Commit hygiene

- Branch naming: `feature/<short>`, `fix/<short>`, `chore/<short>`.
- Conventional commits (see `git log` for examples): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Run the full pre-commit gate before pushing:

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm --filter @somniacos/contracts test
```

- The `feature/agentic-os-kernel` branch is the active OS work branch. `main` deploys to production. Merging requires at least one real Somnia Shannon process completing with multiple `OSAgentRunCompleted` callbacks and real `ProtocolFeePaid` events (see `docs/agentic-os-branch.md`).

---

## 8. Where things live (file index)

| Concern | File |
|---------|------|
| Curated agents + handoff graph | `apps/web/lib/agent-engine.ts` |
| Contract addresses + ABIs | `apps/web/lib/contracts.ts` |
| Server-side event decoding | `apps/web/lib/server-onchain.ts` |
| Server-side OS contract reads | `apps/web/lib/server-os.ts` |
| OS state shaping (UI fallbacks) | `apps/web/lib/os-state.ts` |
| Workbench UI | `apps/web/components/agent-workbench.tsx` |
| Landing page metrics island | `apps/web/components/live-economy.tsx` |
| Core economy contracts | `packages/contracts/src/SomniacOS.sol` |
| OS kernel contracts | `packages/contracts/src/SomniacOSKernel.sol` |
| Foundry tests | `packages/contracts/test/*.t.sol` |
| Seeded economy | `packages/shared/src/index.ts` |
| Postgres schema | `packages/db/schema.sql` |
| Deploy scripts | `scripts/deploy-contracts.ts`, `scripts/deploy-os-kernel.ts` |
| Seed scripts | `scripts/seed.ts`, `scripts/seed-onchain-activity.ts` |
| CI | `.github/workflows/ci.yml` |
| Vercel config | `vercel.json` |

---

## 9. House style

- No emoji in source files unless the user explicitly asks for it.
- Comments only when the WHY is non-obvious. Don't restate what the code does.
- Prefer editing existing files over creating new ones.
- Avoid backwards-compatibility shims when you can change the code instead.
- Trust the framework — don't add error handling for impossible cases.
- Validate at system boundaries only.

These rules come directly from the project root instructions and are reflected in code-review rejections.
