# Deployment

1. Copy `.env.example` to `.env.local` for local development.
2. Configure Somnia RPC, contract addresses, database, Redis, AI provider, and wallet credentials.
3. Deploy contracts with `npm run contracts:deploy`.
4. Deploy persistent runtime/indexer services on infrastructure that supports long-running workers.
5. Deploy `apps/web` to Vercel.
6. Set all `NEXT_PUBLIC_*` frontend variables in Vercel.
7. Keep `GITHUB_TOKEN`, `VERCEL_TOKEN`, and private keys out of Git.

The frontend includes favicon, Apple touch icon, Open Graph metadata, and deployment status surfaces.
