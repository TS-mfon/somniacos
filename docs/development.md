# Development Guide

The official primary Shannon RPC is `https://api.infra.testnet.somnia.network/`; `https://dream-rpc.somnia.network/` is fallback-only.

## Setup

Requires Node.js 22+, pnpm 9+, Foundry, and a Somnia Shannon-funded wallet for live flows.

```bash
pnpm install
cp .env.example .env.local
pnpm --filter @somniacos/web typecheck
pnpm --filter @somniacos/web build
cd packages/contracts && forge test
```

No external model-provider key is required. Agent execution uses wallet-signed Somnia requests and authenticated Somnia Agents Platform callbacks.

## Product Boundary

- Keep the established public product under `/app/*`.
- `/economy/*` is disabled and must redirect to `/app/agent-workbench`.
- Do not add server-generated inference or server-side Website fetching.
- Preserve real proof links and callback recovery.

## Adding A Curated Agent

1. Add the catalog entry in `apps/web/lib/agent-engine.ts`.
2. Map it to an existing deployed capability.
3. Add mission or handoff metadata only when it improves the retained product.
4. Verify the paid transaction, callback, result rendering, History recovery, and error states.

## Debugging

### Callback remains pending

Keep the transaction hash. Confirm the receipt, extract the request id, and re-read the router result. Do not submit another paid request just because the callback is delayed.

### Wallet or transaction failure

Use `normalizeAppError` from `apps/web/lib/app-error.ts`. Preserve the underlying technical message for diagnostics while showing the user a safe message and concrete recovery action.

### RPC reads fail

Distinguish a transaction that is not mined yet from a real RPC outage. Receipt endpoints return `receipt: null` only for a genuine not-found response.

### Website reference fails

The URL must be sent through the Somnia Website agent. Never add an application-server fetch fallback.

## Verification Gate

```bash
forge test
pnpm --filter @somniacos/web typecheck
pnpm --filter @somniacos/web build
git diff --check
```

Before production deployment, also verify `/`, `/app/agent-workbench`, `/app/compare`, `/api/agents/run`, and redirects for `/economy` plus a nested `/economy/*` route.
