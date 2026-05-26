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
- SomniacAgentRouter: `0xb7efE12dBd93DAEDe894A9237aaBd67839A3f09B`

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

## Completed Follow-Up Pass

Commit `d0cd997` completed the first real-interaction pass:

- Added this `AGENT.MD` handoff.
- Replaced remaining static/shared economy UI with contract-derived state from `/api/onchain/activity`.
- Improved wallet and transaction error handling for no wallet, wrong network, rejected signatures, invalid form input, insufficient funds, RPC failures, and receipt timeouts.
- Added a real guided demo lab where a visitor with funded STT can run the scenario as wallet-signed contract transactions.
- Improved the visual system and deployed to Vercel production.

Current follow-up pass adds:

- `GuidedOnboarding`: plain-language wallet, Somnia network, STT, and first-agent-task guidance for zero-knowledge visitors.
- `AgentWorkbench`: deterministic local agent task execution that works without external AI provider keys.
- `runLocalAgentTask`: local agent engine that produces structured deliverables, risk notes, recommended onchain action, and metadata URI.
- `/app/agent-workbench`: page for users to select a real onchain agent, ask it to perform a task, and optionally anchor the output to `WorldEventRegistry`.
- Feature help cards on each dApp section so users understand what to do next.
- Feature-scoped transaction action filtering so users do not see unrelated contract buttons on every page.

Important: current agent task outputs are no longer local deterministic outputs. The Workbench sends wallet-signed requests to `SomniacAgentRouter`, which calls the official Somnia Agents platform and stores callback results onchain.

## Current Somnia Agents Pass

This pass removed the visible transaction console, world feed publishing, marketplace/task posting, demo lab, simulation, economy map, and wallet settings surfaces. The visible dApp is now only:

- `/app/agents`
- `/app/agent-workbench`

Removed routes redirect to `/app/agent-workbench`.

New router:

- Contract: `SomniacAgentRouter`
- Address: `0xb7efE12dBd93DAEDe894A9237aaBd67839A3f09B`
- Deploy tx: `0xdcbb6160027736dd96bdf5c701107156b51c0236903f69f4f4bc570b316492dd`
- Somnia Agents platform: `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`
- LLM Inference agent: `12847293847561029384`
- LLM Parse Website agent: `12875401142070969085`
- JSON API Request agent: `13174292974160097713`

Real tested agent runs:

- LLM content run request `2309285`: returned a publishable dog X post from Somnia LLM. Request tx `0x3b983b45e2ed6c87e6687044c9e27b33c7ebc501ece80b205ba67d466308bc5d`.
- Website parser run request `2309518`: summarized `https://somnia.network/agents` using Somnia website parsing. Request tx `0x6e8a8e1274b0c34e96486046ba271460eff72344fc6c83b11cf48a5c5ee73f51`.

Implementation notes:

- `Run agent` now signs the router transaction immediately.
- There is no separate "Agent output" panel and no separate "Anchor onchain" button.
- Results show only after the router receives the Somnia callback.
- `Anchored results` reads real `AgentRunCompleted` events plus locally cached confirmed runs.
- The first two earlier router deployments were superseded after testing callback behavior. Use only `0xb7efE12dBd93DAEDe894A9237aaBd67839A3f09B`.

Verification completed:

```bash
forge build
forge test
pnpm --filter @somniacos/web build
pnpm run typecheck
```

Latest UX repair pass:

- Reworked the UI toward technological minimalism: deep charcoal base, compact cards, cyan accents, and reduced visual noise.
- Removed global guided onboarding from ordinary pages.
- Simplified the landing page to a minimal product pitch and live proof card.
- Removed visible navigation entries for Command, Demo Lab, World Feed, Simulation, Economy Map, Deploy Agent, and Deploy Company.
- Redirected `/app`, `/app/demo-lab`, `/app/simulation`, `/app/economy-map`, `/app/agents/create`, and `/app/companies/create` away from removed user-facing flows.
- Replaced generic agent workbench behavior with curated functional agents: Marketing Strategist, Content Writer, Research Analyst, Code Auditor, Security Auditor, Treasury Planner, Governance Drafter, and Negotiation Agent.
- Fixed the anchored-output bug: agent output anchoring now writes a recoverable `data:application/json;base64,...` payload to `WorldEventRegistry.metadataURI` instead of an unrecoverable placeholder URI.
- Added decoded anchored output rendering in the workbench, plus local output mirroring for continuity before/while logs are indexed.

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
- `/app/agent-workbench` lets a user pick a real onchain agent, generate task output, and anchor it onchain.
- `/app/agent-workbench` should produce a real X post for "Write an X post about dogs."
- Anchored workbench output should remain recoverable after refresh from decoded onchain metadata when the event is indexed.
- `/app/agents`, `/app/organizations`, `/app/marketplace`, `/app/escrow`, `/app/governance`, `/app/world` show real event-derived state.
- Wallet connect, network switch, transaction submit, receipt confirmation, explorer links, and error states work.
