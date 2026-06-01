# SomniacOS Agentic OS Branch

Branch: `feature/agentic-os-kernel`

This branch is additive. It does not replace the current production router or Workbench path.

## Contracts Added

- `ProtocolFeeVault`: collects the transparent `0.1 STT` protocol fee for OS transactions.
- `CapabilityRegistry`: machine-readable service directory for agent discovery.
- `AutonomyPolicyRegistry`: user-approved autonomy limits.
- `ProcessManager`: persistent process scheduler and lifecycle source of truth.
- `MemoryLedger`: onchain process memory and handoff event log.
- `SomniacAgentRouterV2`: OS-aware Somnia Agents router with LLM, Website, and JSON modes.

## Frontend Added

- `/app/os`: OS Command Center.
- `/app/os/company`: autonomous company scenario launcher.
- `/app/os/capabilities`: capability directory.
- `/app/os/revenue`: protocol revenue dashboard.
- `/app/os/processes/[id]`: judge-facing process proof console.
- `/api/os/processes`: normalized OS process index.
- `/api/os/processes/[id]`: process detail index.
- `/api/os/capabilities`: capability directory API.
- `/api/os/revenue`: protocol fee API.

## Feature Flag

The branch now includes live Somnia Shannon defaults:

- `ProtocolFeeVault`: `0x46ef146089c726fefb039fc13de3915b38588f52`
- `CapabilityRegistry`: `0xe9e9d7a274528d2b055ade9c5f4b7f9df639e2f7`
- `AutonomyPolicyRegistry`: `0x4a38251e67229438235b0999ceb086cb2987b55c`
- `MemoryLedger`: `0xd64faee84313f7564e7dc7655088c3b4a4263cfb`
- `ProcessManager`: `0x5425a0fbb13e860737d56999e21ed14e1adbb142`
- `SomniacAgentRouterV2`: `0x0e6a46564aa6c004ebc9881d09515413842883b8`

Optional overrides:

```bash
NEXT_PUBLIC_ENABLE_OS_KERNEL=true
NEXT_PUBLIC_PROTOCOL_FEE_VAULT=<deployed vault>
NEXT_PUBLIC_CAPABILITY_REGISTRY=<deployed capability registry>
NEXT_PUBLIC_AUTONOMY_POLICY_REGISTRY=<deployed policy registry>
NEXT_PUBLIC_PROCESS_MANAGER=<deployed process manager>
NEXT_PUBLIC_MEMORY_LEDGER=<deployed memory ledger>
NEXT_PUBLIC_SOMNIAC_AGENT_ROUTER_V2=<deployed router v2>
```

If any OS address is missing, the app keeps the stable legacy Agents + Workbench path and shows the OS as not configured.

## Protocol Fee

Every OS write transaction charges `0.1 STT`:

- Policy creation.
- Process creation.
- Process step request.

Callbacks, reads, result viewing, and legacy Workbench mode do not charge protocol fees.

Fee recipient: `0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`.

## Deployment Verification

- `ProtocolFeeVault.feeAmount()` returns `100000000000000000`.
- `ProtocolFeeVault.feeRecipient()` returns `0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`.
- `CapabilityRegistry.getCapabilityCount()` returns `8`.
- `ProcessManager.router()` returns `0x0e6A46564Aa6c004EBC9881D09515413842883b8`.

## Verification

```bash
forge build
forge test
pnpm --filter @somniacos/web build
pnpm --filter @somniacos/web typecheck
```

Do not merge this branch to `main` until at least one real Somnia Shannon process completes with multiple `OSAgentRunCompleted` callbacks and real `ProtocolFeePaid` events.
