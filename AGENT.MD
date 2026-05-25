# SomniacOS Agent Handoff

## Current State

SomniacOS is a fresh monorepo at `/home/sudodave/somniacos`. It is not a retrofit of another local codebase.

- GitHub: `https://github.com/TS-mfon/somniacos`
- Latest known commit before this handoff pass: `5b9a7ac feat: connect dapp to somnia contracts`
- Production host: `https://somniacos.vercel.app`
- Existing Vercel production deployment was verified as `Ready`.
- Live API verified: `https://somniacos.vercel.app/api/onchain/activity` returned `ok: true`, latest block, and `28` decoded real Somnia contract events.

## Somnia Deployment

Network: Somnia Shannon Testnet

- Chain ID: `50312`
- RPC: `https://dream-rpc.somnia.network/`
- Explorer: `https://shannon-explorer.somnia.network`
- Currency: `STT`
- Deployer: `0xEd9EDd8586b20524CafA4F568413C504C9B03172`

Contracts:

- AgentRegistry: `0x45119A32ca6C4d67424401dA92Abe4EC6c83f8Ce`
- OrganizationRegistry: `0xB0DBC829dF852Ea96C14A7D06cE8D773B1F8892b`
- Marketplace: `0x6855B0D90f618885d056F898b14AEa513D633048`
- NegotiationRegistry: `0x6f20e728a36c710ba7ECe9b3378Cb14A69eE0b1B`
- Escrow: `0x191B0d8E70b7866e834821D8DB2bC37780767538`
- Reputation: `0x2Da12543C8389C4C70Ae5560c57830bE0C84B2C9`
- SubscriptionManager: `0x6Eea20692c0f1E0B3400b71a849c4DFAa169E14D`
- Treasury: `0x3C1F34D1f93793Cc07747BE639A472C1e14f3f5f`
- Governance: `0x389cB8A4C506A68b8d1757de12A310C6efd981f9`
- PartnershipRegistry: `0x20e312df00BffD3A4270e4efa0d396d2d0AFE603`
- WorldEventRegistry: `0x4Fe350F97542911DDc95ceb09510f61de05068d9`

## Product Rules

- Do not fake economic state.
- Do not show fake wallets, fake balances, fake transaction hashes, fake agent earnings, fake timestamps, or fake "live" counts.
- Read state from Somnia contract events, transaction receipts, connected wallet state, or direct user input.
- Visitor interaction mode is wallet-only. Do not add a public server hot wallet that signs visitor-triggered transactions.
- Seeded onchain history is acceptable because it is real contract activity from deployed contracts.

## Implemented Before This Pass

- Next.js App Router web app with landing page and function pages.
- Wallet connection and Somnia chain switching via injected wallets.
- Contract ABIs and deployed addresses in `apps/web/lib/contracts.ts`.
- Server onchain activity API in `apps/web/lib/server-onchain.ts` and `/api/onchain/activity`.
- Receipt polling endpoint at `/api/onchain/receipt`.
- Transaction console capable of submitting real wallet-signed writes to all deployed contracts.
- Seed script `scripts/seed-onchain-activity.ts` created real Somnia activity across agents, orgs, marketplace, negotiations, escrow, reputation, subscriptions, treasury, governance, partnerships, and world events.

## Current Pass Plan

1. Add this `AGENT.MD` handoff.
2. Replace remaining static/shared economy UI with contract-derived state from `/api/onchain/activity`.
3. Improve wallet and transaction error handling for no wallet, wrong network, rejected signatures, invalid form input, insufficient funds, RPC failures, and receipt timeouts.
4. Add a real guided demo lab where a visitor with funded STT can run the scenario as wallet-signed contract transactions.
5. Improve the visual system so the app feels modern, agentic, attractive, unique, and production-grade.
6. Run typecheck/build.
7. Deploy the finished site to Vercel.
8. Retry VPS SSH once and document result.

## VPS Status

User requested VPS hosting at `172.236.110.179`, but the server is not currently deployable from this environment.

Observed behavior:

- SSH reaches TCP port `22`.
- SSH then times out during banner exchange.
- HTTP on port `80` also times out with zero bytes.

This is not currently a password problem. The VPS needs provider-console reboot or SSH daemon/network repair before deployment can continue there. Use Vercel as the production target until the VPS is healthy.

## Verification Checklist

Run after changes:

```bash
pnpm run typecheck
pnpm run build
vercel deploy --prod
curl -I https://somniacos.vercel.app
curl -sS https://somniacos.vercel.app/api/onchain/activity
```

Manual browser checks:

- Landing page loads and shows real onchain event activity.
- `/app` command center loads without static fake counts.
- `/app/demo-lab` guides a funded wallet through real transaction steps.
- `/app/agents`, `/app/organizations`, `/app/marketplace`, `/app/escrow`, `/app/governance`, `/app/world` show real event-derived state.
- Wallet connect, network switch, transaction submit, receipt confirmation, explorer links, and error states work.
