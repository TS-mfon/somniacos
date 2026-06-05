# Frontend Route Map

The Next.js App Router project under `apps/web/app/` ships two surfaces:

1. The marketing landing at `/`.
2. The application shell at `/app/*`.

Historical routes that were removed during the OS-section consolidation are kept as `redirect()` stubs so previously-shared URLs do not 404.

---

## Live routes

| Path | File | Purpose |
|------|------|---------|
| `/` | `apps/web/app/page.tsx` | Landing + live proof card |
| `/app` | `apps/web/app/app/page.tsx` | `redirect("/app/agent-workbench")` |
| `/app/agent-workbench` | `apps/web/app/app/agent-workbench/page.tsx` | Regular one-agent task runner |
| `/app/missions` | `apps/web/app/app/missions/page.tsx` | Mission templates, Launch Token, agent chain preview |
| `/app/agents` | `apps/web/app/app/agents/page.tsx` | Curated agent catalog from `lib/agent-engine.ts` |
| `/app/agents/[id]` | `apps/web/app/app/agents/[id]/page.tsx` | Public agent profile with compatible missions |
| `/app/compare` | `apps/web/app/app/compare/page.tsx` | API-backed result comparison across multiple agents |
| `/app/receipts` | `apps/web/app/app/receipts/page.tsx` | Mission and proof receipt archive |
| `/app/history` | `apps/web/app/app/history/page.tsx` | Completed outputs, token launches, confidence, proof JSON |
| `/app/docs` | `apps/web/app/app/docs/page.tsx` | In-app user, judge, developer, and troubleshooting docs |
| `/app/revenue` | `apps/web/app/app/revenue/page.tsx` | Protocol fee dashboard reading `ProtocolFeeVault` directly |

The Workbench is the regular task surface. It:

- Loads `curatedAgents` from `lib/agent-engine.ts`.
- Hydrates wallet-local memory from `localStorage` (`AgentMemory`).
- Posts to `/api/agents/run` for an immediate LLM result.
- Concurrently builds and signs `SomniacAgentRouterV2.launchWorkflowAgentRun(...)`.
- Polls `/api/onchain/receipt?hash=…` until the transaction is mined.
- Tails `OSAgentRunCompleted` and merges decoded results into the latest result panel.

The Missions page is the structured workflow surface. It:

- Loads mission templates from `agentMissions`.
- Shows a mission selector and agent chain preview.
- Reveals Launch Token fields only for the `launch-token` mission.
- Saves mission receipts and token artifacts to local proof stores.
- Keeps mission output separate from regular Workbench output.

The Compare page is an API-backed utility surface. It:

- Runs one prompt through two or three regular agents.
- Scores outputs with `AgentConfidence`.
- Saves compare sessions locally.
- Does not pretend to create an onchain proof; users can rerun the chosen result in Workbench when proof is required.

---

## Redirected routes

All of the following return `redirect("/app/agent-workbench")`. They were once dedicated dashboards before the OS section was removed, and remain only to preserve link integrity.

| Path | Original purpose |
|------|------------------|
| `/app/agents/create` | Deploy an agent |
| `/app/companies/create` | Deploy an AI company |
| `/app/demo-lab` | Guided onboarding lab |
| `/app/deployment` | Vercel deployment status |
| `/app/disputes` | Dispute court |
| `/app/economy-map` | Economy map |
| `/app/escrow` | Escrow center |
| `/app/governance` | Governance console |
| `/app/marketplace` | Marketplace |
| `/app/marketplace/tasks/[id]` | Task detail |
| `/app/memory` | Agent memory explorer |
| `/app/negotiations` | Negotiation center |
| `/app/negotiations/[id]` | Negotiation room |
| `/app/organizations` | Organization directory |
| `/app/organizations/[id]` | Organization dashboard |
| `/app/os` | OS Command Center |
| `/app/os/capabilities` | Capability directory |
| `/app/os/company` | Autonomous company scenario launcher |
| `/app/os/processes/[id]` | Judge-facing process console |
| `/app/os/revenue` | Earlier OS revenue page (replaced by `/app/revenue`) |
| `/app/partnerships` | Partnership registry |
| `/app/payments` | Payments ledger |
| `/app/reputation` | Reputation network |
| `/app/security` | Security console |
| `/app/settings` | User + wallet settings |
| `/app/simulation` | Live agent loop panel |
| `/app/subscriptions` | Subscription agreements |
| `/app/treasury` | Treasury console |
| `/app/world` | Live world feed |

Removing these stubs is a breaking change — leave them in place unless deliberately versioning the UI surface.

---

## SEO & PWA chrome

`apps/web/app/layout.tsx` sets:

- Open Graph and Twitter card metadata pointing at the SomniacOS landing.
- Apple touch icon, favicon, and theme color.
- The dark `command-center` palette (signal-cyan accent on `#131313` charcoal).

The landing page exports `<LiveMetrics />` from `apps/web/components/live-economy.tsx`. It reads:

- `/api/onchain/activity` for event counts and the latest block.
- `/api/os/revenue` for `totalCollected` and `feeRecipient`.

These reads are the only client-side calls from the landing page; they ensure the proof card never displays fake counters.
