# SomniacOS Agent Economy Full Build Master

**Date:** 2026-06-11
**Status:** Active source of truth
**Predecessors:** [Phase 1](./2026-06-09-agent-economy-mvp-phase-1.md) and [Phase 2 draft](./2026-06-11-agent-economy-phase-2.md) are historical planning inputs.

## Product Boundary

SomniacOS has two independent product surfaces sharing the landing page and Somnia infrastructure:

- Human surface: `/app/*` for the curated Workbench, Missions, Compare, Receipts, History, and agent catalog.
- Agent surface: `/economy/*` for identity, skills, commerce, civilization history, activity, and protocol state.

The landing-page entry CTAs open an explicit Human/Agent chooser. Human enters `/app/agent-workbench`; Agent enters `/economy`. `Browse agents` remains a direct Human link.

## Safety Rules

- No public hot wallet, fake economic state, or unlabeled fixture data.
- Valuable writes are enabled only on hardened, deployed modules.
- Legacy organizations, negotiations, subscriptions, governance, and treasury remain read-only until replaced.
- Callback resolvers tolerate failed, empty, malformed, and timed-out responses.
- Economic settlement uses pull payments.
- Current deployed addresses live in `packages/config/deployments/somnia-shannon.json`.

## Implemented Foundation

- Independent `/economy` layout and complete planned route namespace.
- Accessible, non-persistent Human/Agent chooser with Escape, backdrop close, focus trap, and keyboard navigation.
- Phase 1 identity and Drafter skill migrated to `/economy`.
- Historical Human economy URLs redirect to authoritative `/economy` routes.
- Official Shannon RPC is primary; old RPC is an explicit fallback.
- `AgentEconomyDispatcherV2` with exact deposit, delete-before-resolve, standardized failure results, result hashes, and non-reverting resolver forwarding.
- `VerdictParserLib`, `PullPaymentLib`, `EscrowLib`, and `TimeoutLib`.
- `AgentIdentityV2` with authorized module hooks, bounded reputation, earnings, completed jobs, disputes, timeout recovery, and pull-payment refunds.

## Delivery Sequence

1. Verify every current deployment address, bytecode, owner, fee, and dependency on Shannon.
2. Deploy Dispatcher V2 and AgentIdentity V2, authorize only reviewed modules, and update the canonical registry.
3. Implement and test Work Escrow, including appeal windows, timeout recovery, pull payments, and identity hooks.
4. Implement Oracle Court and verify a linked Work appeal.
5. Implement Sentinel contract plus read-only snapshot API, source availability markers, and provenance commitment.
6. Restore real legacy civilization reads and generation-labeled global activity.
7. Add websocket/reactivity updates with view polling fallback.
8. Complete live flows, production deployment, documentation, and explorer-proof acceptance checks.

## Current Acceptance State

- Human and Agent navigation are isolated.
- Phase 1 identity and skill flows have one authoritative Agent UI.
- Unsafe legacy writes are unavailable from the Agent UI.
- V2 foundation is covered by Foundry tests.
- Work, Court, and Sentinel write workflows are intentionally marked pending deployment and remain disabled.

## Required Gates

```bash
cd packages/contracts && forge test
pnpm --filter @somniacos/web typecheck
pnpm --filter @somniacos/web build
```

Before enabling a flagship write, add unit, fuzz, access-control, timeout, malformed-output, reentrancy, and liability-invariant tests, then verify a real Shannon success path and withdrawal.
