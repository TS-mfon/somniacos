# SomniacOS Agent Handoff

## Current State

SomniacOS is a fresh monorepo at `/home/sudodave/somniacos`. It is not a retrofit of another local codebase.

- GitHub: `https://github.com/TS-mfon/somniacos`
- Active branch for OS work: `feature/agentic-os-kernel`
- Latest stable production commit before OS branch: `9a4430c chore: seed agent callback receipts`
- Production host: `https://somniacos.vercel.app`
- Current Vercel production deployment: `dpl_C5ae2K2dqf7FtuQNH2D6aPMYtBsn`
- Current Vercel URL: `https://somniacos-bqnpq9m00-gen-daves-projects.vercel.app`
- Live alias verified: `https://somniacos.vercel.app`
- Live API verified: `https://somniacos.vercel.app/api/onchain/activity` returned `ok: true`, block `392993994`, and `32` decoded real Somnia contract events, including `AgentRunCompleted` callback outputs.

## 2026-06-01 Agentic OS Kernel Update

Branch: `feature/agentic-os-kernel`

This pass implements the one-transaction OS workflow requested after the revenue/gas/OS persistence issues:

- `Run agent` now sends one wallet-signed transaction to `SomniacAgentRouterV2.launchWorkflowAgentRun`.
- That one transaction creates the autonomy policy, creates the OS process, pays the `0.1 STT` protocol fee, deposits the Somnia agent fee, and requests the Somnia agent run.
- The UI no longer asks the user to deploy/create agents for normal use.
- The visible navigation is reduced to Agents, Workbench, OS, and Revenue; the Capabilities UI was removed/redirected.
- The OS process list and process detail pages now read direct contract state from `ProcessManager` first, so process data persists after refresh even when recent event windows move.
- The Revenue page reads `ProtocolFeeVault.totalCollected`, `feeAmount`, and `feeRecipient` directly from the deployed fee vault, so protocol fee totals update after real transactions.
- The revenue wallet is `0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`.
- Gas handling was changed to explicitly estimate gas and submit a buffered gas limit, reducing the wallet gas-limit failure where users had to switch away and back manually.
- The Workbench now runs a real server-side specialist agent after the signed Somnia transaction. It prefers `OPENAI_API_KEY` when configured, and currently falls back to a public LLM endpoint because Vercel has no environment variables set.
- The server-side agent route also fetches up to three user-provided URLs and passes extracted reference text into the specialist prompt, enabling the requested web-fetch behavior.
- Agent results are displayed immediately in the modal and `Anchored results` after the signed OS transaction. Somnia callback results are still read and preferred when the onchain callback arrives.

New OS kernel deployment on Somnia Shannon:

- ProtocolFeeVault: `0xfd74c336792dd54862e6694bb76ff865aac06cf0`
- CapabilityRegistry: `0xbf5163d30a914d907be2fb9973940668e404127e`
- AutonomyPolicyRegistry: `0x36f5e0b1d305255eeca1b39583239fdac59c3318`
- MemoryLedger: `0x051c953d7a28a0f6d1738f238ad4bea3454312a8`
- ProcessManager: `0xa345c95ce5d3b5b2e12d6cee31b1289865b7456a`
- SomniacAgentRouterV2: `0xe426357cc73f67efa9bc5741b4875a6a52a55c99`

Deployment transactions:

- ProtocolFeeVault: `0x6b2b714ff52034ba88cfac53aa3772e80256e7171be3c5e686303db662650a33`
- CapabilityRegistry: `0xf44947cadba3f9bceaaa6dc5cd31aec41ad1ee91290058a2acb2d4c95d640e5f`
- AutonomyPolicyRegistry: `0x65638c8351d4b9fa9f5062b9c40fcfc205168f926522ee148c6efe2832877d38`
- MemoryLedger: `0xdc23a287e08c076cf46ec7fed5f494d7ef2a7710cd145d20273eb795274ebf6c`
- ProcessManager: `0xec9cb020bb625cd5718451c68cf2402412389a1c63ae6b49a75f6f5c379afa63`
- SomniacAgentRouterV2: `0x0b0ab361d3f8b42821966ac0a214193323f32f762bd9df78a2ea4c969afddaa9`
- ProcessManager.setRouter: `0xc94409622c07c23fd70dd147dfae60651fc7beb27c1dcb23450da1373d0b279d`
- AutonomyPolicyRegistry.setWorkflowCreator: `0x178777ba1c623d416168d95d49ff0e14475967c767d8357a296d479fe15e9489`

Verified onchain reads:

- `ProtocolFeeVault.feeRecipient()` returned `0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`.
- `ProtocolFeeVault.feeAmount()` returned `100000000000000000` (`0.1 STT`).
- `SomniacAgentRouterV2.getTotalDue(0)` returned `340000000000000000` (`0.34 STT` total for LLM mode: `0.24 STT` Somnia agent deposit plus `0.1 STT` protocol fee).
- `AutonomyPolicyRegistry.workflowCreator()` returned `0xe426357CC73F67efa9bC5741b4875a6a52a55c99`.

Seeded real OS activity:

- Workflow tx: `0xdfe2b7d513ab1f656a5d374008225864ea51d8ea8ec3206a390275457009c80a`
- Process ID: `1`
- Step ID: `1`
- Request ID: `3788699`
- `ProcessManager.nextProcessId()` returned `2` after seeding.
- `ProtocolFeeVault.totalCollected()` returned `100000000000000000` after seeding.

Verification completed in this pass:

```bash
forge test
pnpm --filter @somniacos/web typecheck
pnpm --filter @somniacos/web build
curl -sS "https://text.pollinations.ai/Write%20one%20short%20sentence%20about%20dogs"
```

Vercel deployment completed:

- Preview deployment: `https://somniacos-rnlw57b5l-gen-daves-projects.vercel.app` (`dpl_EYDCTN83YtUfw4SttAsSAwgjw7th`). Preview is protected by Vercel authentication.
- Production deployment: `https://somniacos-dwin5tt0u-gen-daves-projects.vercel.app` (`dpl_34AC27zxDU5HupNPfeoPhq5Gbktg`).
- Public alias: `https://somniacos.vercel.app`.

Production verification completed:

- `curl -I https://somniacos.vercel.app` returned HTTP `200`.
- `https://somniacos.vercel.app/api/os/revenue` returned direct contract revenue with `totalFees: 0.1000 STT`, `feeAmount: 0.1000 STT`, and fee recipient `0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`.
- `https://somniacos.vercel.app/api/os/processes` returned `source: contract` with seeded process `#1`, request `3788699`, and `feesPaid: 0.3400 STT`.
- `POST https://somniacos.vercel.app/api/agents/run` returned a live LLM result for a dog X post using provider `pollinations`.

## 2026-06-01 OS Section Removal

The visible OS section was removed because it was not useful to visitors.

- App navigation is now only Agents, Workbench, and Revenue.
- Revenue moved from `/app/os/revenue` to `/app/revenue`.
- `/app/os`, `/app/os/company`, `/app/os/capabilities`, `/app/os/processes/[id]`, and `/app/os/revenue` now redirect away from the removed OS UI.
- The unused `OSCommandCenter` component was removed.
- OS APIs and contracts remain in place because Workbench and Revenue still use the underlying one-transaction workflow and fee accounting.
- Verification after removal: `pnpm --filter @somniacos/web build` and `pnpm --filter @somniacos/web typecheck`.

Current caveat:

- The new Workbench output path is real LLM execution, but because the Vercel project currently has no `OPENAI_API_KEY`, it uses the public fallback provider. For stronger reliability, add `OPENAI_API_KEY` and optionally `OPENAI_MODEL` to Vercel.
- The Somnia Agent callback for the seeded `SomniacAgentRouterV2` workflow had not completed at handoff time; direct process state correctly shows the pending request.

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

## Agentic OS Kernel Branch

The branch `feature/agentic-os-kernel` adds the operating-system layer without changing `main`.

New deployed Somnia Shannon contracts:

- ProtocolFeeVault: `0x46ef146089c726fefb039fc13de3915b38588f52`
- CapabilityRegistry: `0xe9e9d7a274528d2b055ade9c5f4b7f9df639e2f7`
- AutonomyPolicyRegistry: `0x4a38251e67229438235b0999ceb086cb2987b55c`
- MemoryLedger: `0xd64faee84313f7564e7dc7655088c3b4a4263cfb`
- ProcessManager: `0x5425a0fbb13e860737d56999e21ed14e1adbb142`
- SomniacAgentRouterV2: `0x0e6a46564aa6c004ebc9881d09515413842883b8`

Protocol monetization:

- Fee amount: `0.1 STT` per OS write transaction.
- Fee recipient: `0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`.
- Fee-charged actions: policy creation, process creation, and process agent-step requests.

Seeded capabilities:

- `content.write`
- `marketing.strategy`
- `research.web`
- `research.api`
- `audit.code`
- `treasury.plan`
- `governance.draft`
- `security.monitor`

Verified post-deploy reads:

- `ProtocolFeeVault.feeAmount()` returned `100000000000000000`.
- `ProtocolFeeVault.feeRecipient()` returned `0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`.
- `CapabilityRegistry.getCapabilityCount()` returned `8`.
- `ProcessManager.router()` returned `0x0e6A46564Aa6c004EBC9881D09515413842883b8`.

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

Important: current agent task outputs are not local deterministic outputs. The Workbench sends wallet-signed requests to `SomniacAgentRouter`, which calls the official Somnia Agents platform and stores callback results onchain.

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

- LLM content run request `2309285`: returned a publishable dog X post from Somnia LLM. Request tx `0x3b983b45e2ed6c87e6687044c9e27b33c7ebc501ece80b205ba67d466308bc5d`; callback tx `0xe450db904f0aebbe8d41912223030d4bae1d5173feeb957b2641611d7c252b85`.
- Website parser run request `2309518`: summarized `https://somnia.network/agents` using Somnia website parsing. Request tx `0x6e8a8e1274b0c34e96486046ba271460eff72344fc6c83b11cf48a5c5ee73f51`; callback tx `0x73c2b12288b4bd261d92beb23703b5773c8e1e999b533c92c0065abf93bcdc99`.

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

Latest finalization pass:

- Added the two real Somnia Agent request transactions and the two callback transactions to the seeded receipt index so production can always decode the proof trail, even after the recent-log window moves.
- Rebuilt with `pnpm --filter @somniacos/web build`.
- Rebuilt Vercel Build Output API artifact with `npx vercel build --prod`.
- Deployed with `npx vercel deploy --prebuilt --prod --archive tgz`.
- Verified production returned HTTP `200`.
- Verified production `/api/onchain/activity` includes `AgentRunCompleted` with actual returned results for the content writer and research analyst.

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

- Landing page loads as a minimal pitch with no fake world/activity claims.
- Navigation only exposes Agents and Workbench.
- Removed routes redirect to `/app/agent-workbench`.
- `/app/agents` shows curated functional agents.
- `/app/agent-workbench` lets a funded wallet pick an agent, sign `Run agent`, wait for the Somnia callback, and see the result in the modal and Anchored Results.
- `/app/agent-workbench` should produce a real X post for "Write an X post about dogs."
- Anchored Results should show the seeded completed content writer and research analyst callback outputs from `AgentRunCompleted`.
- Wallet connect, network switch, request deposit, receipt confirmation, explorer links, callback polling, and error states work.
