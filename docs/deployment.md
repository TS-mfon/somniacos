# Deployment

Production target: **Vercel** for the dApp, **persistent infrastructure** for runtime and indexer. Public URL: <https://somniacos.vercel.app>.

This document covers what to deploy, in what order, and how to verify.

---

## 1. Deployment topology

```
                ┌────────────────────────┐
                │   Vercel (apps/web)    │
                │  Edge: static assets   │
                │  Node:  /api/*         │
                └──────────┬─────────────┘
                           │ reads RPC, OpenAI
                           ▼
                ┌────────────────────────┐
                │  Somnia Shannon RPC    │
                │ dream-rpc.somnia.network│
                └──────────┬─────────────┘
                           │ events + state
   ┌───────────────────────┼─────────────────────────┐
   ▼                       ▼                         ▼
Postgres + pgvector   Long-running VM           Long-running VM
(`indexed_*` tables)  (apps/indexer)            (apps/runtime)
                       Redis cache              Redis cache
```

The Vercel deployment owns the user-facing HTTP surface. The two persistent workers own the autonomous civilization layer. Postgres + Redis are shared.

---

## 2. Prerequisites

| Resource | Required by | Notes |
|----------|-------------|-------|
| Vercel project | apps/web | `vercel link` + `vercel env pull` |
| Somnia Shannon-funded deployer wallet | contract deploys, seed scripts | `PRIVATE_KEY` |
| (Optional) OpenAI API key | `/api/agents/run` | `OPENAI_API_KEY` |
| (Optional) Postgres 16 with pgvector | indexer + runtime | `DATABASE_URL` |
| (Optional) Redis 7 | runtime + indexer cache | `REDIS_URL` |
| (Optional) VM / container host | apps/runtime + apps/indexer | Anything not serverless |

---

## 3. Contract deployment

### Core economy bundle

```bash
export PRIVATE_KEY=0x…
export SOMNIA_RPC_URL=https://dream-rpc.somnia.network/
pnpm contracts:deploy
```

The script writes the new addresses to stdout. Mirror them into:

- `apps/web/lib/contracts.ts` → `contracts`
- `.env.example` → `NEXT_PUBLIC_*` keys
- Vercel project env vars (`NEXT_PUBLIC_*`)

### OS kernel bundle

```bash
export PROTOCOL_FEE_RECIPIENT=0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E   # optional
pnpm contracts:deploy:os
```

`scripts/deploy-os-kernel.ts` deploys, wires (`setRouter`, `setWorkflowCreator`, `setProcessManager`), and seeds the eight default capabilities. Results land in `packages/config/deployments/somnia-shannon.json`. Mirror addresses into `apps/web/lib/contracts.ts` (`osContracts`) and Vercel env vars.

### Verification

```bash
pnpm healthcheck
# expected: chain id 50312, RPC reachable, all contract addresses respond to a simple staticcall
```

---

## 4. Vercel deployment

### One-time setup

```bash
cd somniacos
vercel link --yes                  # links the repo to a Vercel project
vercel env pull .env.vercel.local  # fetches current env vars for local builds
```

Then in the Vercel dashboard add:

| Scope | Keys |
|-------|------|
| Production + Preview | All `NEXT_PUBLIC_*` keys from `.env.example` |
| Production | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Production | (Optional) `DATABASE_URL`, `REDIS_URL`, `VECTOR_DATABASE_URL` |

`vercel.json` already configures:

```json
{
  "buildCommand": "pnpm --filter @somniacos/web build",
  "devCommand":   "pnpm --filter @somniacos/web dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

### Deploy

```bash
pnpm install
pnpm run typecheck
pnpm run build
vercel deploy --prod
```

For repeat deploys after changes:

```bash
pnpm --filter @somniacos/web build
npx vercel build --prod
npx vercel deploy --prebuilt --prod --archive tgz
```

### Verify

```bash
curl -I https://somniacos.vercel.app                    # expect HTTP 200
curl -sS https://somniacos.vercel.app/api/onchain/activity | head -c 400
curl -sS https://somniacos.vercel.app/api/os/revenue
curl -sS https://somniacos.vercel.app/api/os/processes
```

Then in a browser:

1. Connect a Somnia-funded wallet.
2. Switch to Shannon if prompted.
3. From `/app/agent-workbench`, run an agent. Sign the transaction.
4. Wait for the receipt; the Workbench shows the LLM result immediately and replaces it with the onchain callback when `OSAgentRunCompleted` is observed.
5. Confirm the new run appears in the Anchored Results panel.

---

## 5. Runtime and indexer hosting

These are **not** suitable for Vercel — they need persistent open connections and per-tick in-memory state.

Recommended hosts:

| Component | Suggested host |
|-----------|----------------|
| `apps/runtime` | Fly machine, Render worker, or Hetzner / Linode VM |
| `apps/indexer` | Same as runtime, or a dedicated worker per chain |
| Postgres | Neon, Supabase, RDS — with `pgvector` extension |
| Redis | Upstash or managed Redis |

Build & run:

```bash
pnpm install --filter @somniacos/runtime --filter @somniacos/indexer
pnpm --filter @somniacos/runtime build   # if a build script is added
pnpm --filter @somniacos/runtime exec node dist/index.js
```

Apply the database schema once:

```bash
psql $DATABASE_URL -f packages/db/schema.sql
```

See `docs/runtime.md` for the consumer contract.

---

## 6. Secrets discipline

Never commit any of the following:

- `.env`, `.env.local`, `.env.vercel.local`
- `PRIVATE_KEY` (deployer or runtime signers)
- `OPENAI_API_KEY`
- `GITHUB_TOKEN`, `VERCEL_TOKEN`
- Any file under `buildenv/`

Operator runbook for environment-loading is in `docs/github-vercel-commands.md`.

---

## 7. Rollback

The contracts are not upgradeable. To roll back the dApp:

1. `vercel rollback <deployment-id>` for the frontend.
2. For a kernel revert, re-deploy the previous OS kernel addresses and update `apps/web/lib/contracts.ts` (`osContracts`) + Vercel env vars to the prior set. Existing processes on the old kernel continue to function; new transactions route through whatever the frontend is configured for.

The legacy `SomniacAgentRouter` (v1) is intentionally still deployed and indexed for this reason.

---

## 8. VPS note

A VPS at `172.236.110.179` was attempted as an alternative host. As of the latest pass, SSH reaches TCP/22 but times out during banner exchange, and HTTP/80 returns zero bytes. The VPS needs provider-console reboot or SSH daemon / network repair before redeployment can target it. Until then, Vercel remains the production frontend host.
