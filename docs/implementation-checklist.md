# SomniacOS Acceptance Checklist

This is the gate before any change is merged to `main` or deployed to production. Each line is a binary check.

## Product

- [ ] Landing page (`/`) loads and positions SomniacOS as the Autonomous Economy Layer.
- [ ] Live proof card on the landing shows non-zero block number and non-zero event count from `/api/onchain/activity`.
- [ ] `/app` redirects to `/app/agent-workbench`.
- [ ] `/app/agent-workbench` is the only live agent runner; the Workbench can sign a transaction and render a callback result.
- [ ] `/app/agents` enumerates `curatedAgents` and links each to a Workbench prefill.
- [ ] `/app/revenue` shows `ProtocolFeeVault.totalCollected` formatted in STT.
- [ ] All redirect stubs (see `docs/pages.md`) still resolve and redirect to `/app/agent-workbench`.
- [ ] UI keeps the dark command-center palette; no emoji unless explicitly requested.

## Onchain

- [ ] Core economy contracts deployed on Somnia Shannon; addresses match `docs/contracts-deployed.md` and `apps/web/lib/contracts.ts`.
- [ ] OS kernel deployed and wired: `ProcessManager.router() == SomniacAgentRouterV2`, `AutonomyPolicyRegistry.workflowCreator() == SomniacAgentRouterV2`, `MemoryLedger.processManager() == ProcessManager`.
- [ ] `CapabilityRegistry.getCapabilityCount() == 8` after deploy seeding.
- [ ] `ProtocolFeeVault.feeAmount() == 100000000000000000` (`0.1 STT`).
- [ ] `ProtocolFeeVault.feeRecipient() == 0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`.
- [ ] `SomniacAgentRouterV2.getTotalDue(0)` returns the expected `deposit + 0.1 STT` for LLM mode.

## Tests

- [ ] `forge test` is green in `packages/contracts`.
- [ ] `pnpm run typecheck` is green across the workspace.
- [ ] `pnpm run build` is green for `apps/web`.

## End-to-end

- [ ] From a Somnia-funded wallet, running an agent on `/app/agent-workbench` produces:
  - A signed transaction submitted to `SomniacAgentRouterV2.launchWorkflowAgentRun`.
  - A receipt visible via `/api/onchain/receipt`.
  - An `OSAgentRunCompleted` event observed in `/api/onchain/activity`.
  - A non-empty decoded result in the Anchored Results panel.
- [ ] `/api/os/processes` returns at least one process from the direct contract path (`source: "contract"`).
- [ ] `/api/os/revenue` returns `totalCollected > 0` and a `feeRecipient` matching the vault read.

## Deployment

- [ ] `.env.example` lists every required key (frontend `NEXT_PUBLIC_*` + server-only secrets).
- [ ] Vercel project has every `NEXT_PUBLIC_*` key plus `OPENAI_API_KEY` (when using OpenAI).
- [ ] `vercel.json` targets `apps/web`.
- [ ] Runtime + indexer are hosted on persistent infrastructure (not Vercel).
- [ ] No `.env*`, private key, GitHub token, or Vercel token is committed.

## Documentation

- [ ] `README.md`, `docs/architecture.md`, `docs/contracts.md`, `docs/api.md`, `docs/os-workflow.md`, `docs/runtime.md`, `docs/development.md`, and `docs/deployment.md` accurately reflect the current code.
- [ ] `docs/contracts-deployed.md` matches `apps/web/lib/contracts.ts`.
- [ ] `AGENT.MD` handoff log notes the latest verified onchain reads.

## Product rules (must not regress)

- [ ] No fake economic state — every visible metric is derivable from contract state, decoded events, the connected wallet, or explicit user input.
- [ ] No public server hot wallet for visitor-triggered transactions.
- [ ] Seeded onchain history is real contract activity (`pnpm seed:onchain`), not synthetic UI data.
