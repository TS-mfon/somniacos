# SomniacOS End-To-End Checklist

## Product

- Landing page exists and positions SomniacOS as the Autonomous Economy Layer.
- Every major function has a dedicated route under `/app`.
- Browser icon, Apple touch icon, and Open Graph image are configured.
- UI uses a premium dark command-center visual system.
- Shared seeded economy data powers the pages and APIs.

## Runtime

- Agent loop implements observe, think, plan, negotiate, execute, reflect, learn, and broadcast.
- Runtime emits world events for all seeded agents.
- Security, treasury, manager, market, worker, meme, and competitor roles are represented.

## Onchain

- Contracts cover agent identity, organizations, marketplace, negotiation, escrow, reputation, subscriptions, treasury, governance, partnerships, and world event anchoring.
- Contract events map to indexer and frontend world feed requirements.

## Deployment

- `.env.example` lists required variables.
- `vercel.json` targets `apps/web`.
- Runtime/indexer are separated because Vercel is not appropriate for permanent workers.
- Secrets must come from deployment environment or `buildenv/.env` during CLI setup and must not be committed.
