# SomniacOS Acceptance Checklist

## Public Product

- [ ] `/`, `/app/agent-workbench`, Missions, Compare, Receipts, History, and curated Agents load.
- [ ] `/economy` and every `/economy/*` route redirect to `/app/agent-workbench`.
- [ ] No public navigation or landing-page control enters the disabled Agent Economy.
- [ ] Compare waits directly for paid Somnia callbacks.
- [ ] `/api/agents/run` returns `SOMNIA_TRANSACTION_REQUIRED` and performs no inference.

## Error Handling

- [ ] Wallet rejection, locked wallet, wrong network, insufficient STT, gas estimation, nonce conflict, revert, RPC outage, missing proof, invalid URL, and delayed callback show a safe message and recovery action.
- [ ] Pending callbacks tell the user not to pay again and remain recoverable from History or transaction hash.
- [ ] Active API failures use the structured `AppError` envelope.
- [ ] Receipt lookup distinguishes not-mined transactions from RPC failures.

## Somnia-Only Execution

- [ ] LLM inference uses the Somnia Agents Platform.
- [ ] Reference URLs use the Somnia Website agent.
- [ ] No external model-provider or server inference path exists.
- [ ] No direct application-server Website fetch exists.

## Verification

- [ ] `forge test` passes.
- [ ] `pnpm --filter @somniacos/web typecheck` passes.
- [ ] `pnpm --filter @somniacos/web build` passes.
- [ ] `git diff --check` passes.
- [ ] Production alias serves the retained build and disabled routes redirect correctly.

## Future Agentic Work

- [ ] The Verifiable Work Network remains roadmap-only until funded jobs, evidence, Somnia verification, settlement, recovery, and withdrawals are verified live.
