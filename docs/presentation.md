# SomniacOS Weekly Product Update Presentation

## Two Surfaces, One Economy

The Human surface is where people direct useful work. The Agent Economy is where agents establish identity, call capabilities, discover funded work, earn STT, coordinate, and eventually resolve disputes. Both use Somnia proof infrastructure, but valuable Agent Economy writes are enabled only after hardened contracts are deployed and verified.

This deck is written as a PowerPoint-ready script for pitching this week's SomniacOS progress to the team. It focuses on what changed, why it matters, how the current product works, and what is now ready for judges and users.

## Slide 1: Title

**SomniacOS: From Agent Workbench To Agentic Economy OS**

This week we moved SomniacOS from a broad agent demo into a cleaner, more usable, more judge-ready dApp. The core idea remains the same: SomniacOS is an autonomous economy layer on Somnia where users do not just chat with AI; they run specialist agents, launch structured missions, sign wallet-backed actions, receive outputs, and inspect proof.

The major product shift this week was separation of concerns. Workbench is now for regular one-agent tasks. Missions is now for structured workflows like Launch Token. Compare is now for running the same prompt against multiple agents before choosing the best result. Receipts now package proof metadata. Docs are now organized into proper subpages.

## Slide 2: What We Fixed Strategically

The earlier product had too much mixed into one surface. Token launch, regular content tasks, mission workflows, result history, and proof concepts were all competing for attention. That made the app feel less clear than the concept deserved.

This week we cleaned the mental model:

- **Workbench** is for one useful agent task.
- **Missions** is for multi-step workflows and wallet actions.
- **Launch Token** is mission-only because it involves validation, signing, deployment, and token artifacts.
- **Compare** is for evaluating multiple agent outputs side-by-side.
- **Receipts** is for proof metadata and mission artifacts.
- **Docs** is for onboarding users, judges, and developers.

This makes the dApp easier to explain in one minute and easier to use without prior web3 knowledge.

## Slide 3: Workbench Upgrade

Workbench is now intentionally simple. A user selects a specialist agent, enters a task, adds constraints, optionally adds URLs, chooses a result format, and runs the agent. The page no longer shows mission controls or token launch fields.

This matters because users coming for a normal task should not see deployment UI. If someone wants a content post, code audit, wallet safety checklist, research brief, productivity plan, or email draft, they should not have to understand mission architecture.

The Workbench now supports saved context, confidence scoring, visible results, next actions, handoffs, source labels, and stronger error recovery. It remains the fastest path for a visitor to get value from SomniacOS.

## Slide 4: Missions Upgrade

Missions is now the structured workflow surface. It uses mission templates and shows mission-specific UI based on the selected mission.

For example, if the user selects **Launch Token**, the page shows token name, symbol, decimals, initial supply, owner, and metadata URI. If the user selects a research or audit mission, the token deployment form disappears and the user sees normal task and constraint controls.

This is a major usability improvement because it proves that the dApp is not a static mockup. The UI changes based on mission intent, the agent chain is visible, and each mission has a clear execution model.

## Slide 5: Launch Token Is Now Correctly Treated As A Mission

Launch Token is not a regular Workbench action. It is a mission because it includes multiple stages:

- The Token Launch Agent validates launch parameters.
- The Token Research Agent can review tokenomics and risks.
- The connected wallet signs the TokenFactory deployment.
- The app extracts the `TokenCreated` event after receipt confirmation.
- The result becomes a token artifact with address, owner, supply, deployer, metadata URI, and transaction hash.

The user never shares a private key. The agent prepares and explains; the user signs from their wallet. This is exactly the kind of user-safe, non-custodial agent workflow we want to demonstrate on Somnia.

## Slide 6: Agent Chain Preview

Missions now includes an **Agent Chain Preview**. Before execution, the user can see which agents are involved, what each step does, whether a step uses previous output, and whether a step requires wallet signing.

For Launch Token, the chain shows planning, tokenomics review, wallet deployment, and launch copy. This makes the dApp feel agentic before the user signs anything. It also helps judges understand that SomniacOS is built around agent workflows, not just isolated prompts.

This preview is important because it communicates autonomy and coordination in a way a normal dashboard cannot.

## Slide 7: Security Sentinel Fix

We fixed the oversized Security Sentinel card. Previously, on smaller screens the user had to zoom out to see the `Open wallet` button. That was a critical UX problem because wallet signing is central to the dApp.

The modal now has a constrained height, scrollable review rows, tighter spacing, and a sticky action area. The `Open wallet` and `Cancel` buttons remain visible without zooming.

This improves both usability and safety. Users can review the action and still reach the wallet button easily.

## Slide 8: Paid Compare Upgrade

Compare was upgraded from an API-only evaluator into a wallet-backed multi-agent execution surface. This fixes a major product flaw: previously, if the external provider timed out, Compare could show a local resilience answer that looked like a real agent result. That is no longer acceptable for the judging path.

The new Compare behavior is:

1. The user enters one task.
2. The user selects two or three specialist agents.
3. The app quotes the real Somnia agent fee per selected agent and the total selected cost.
4. The user signs one Somnia router transaction per selected agent because the current deployed router does not expose a batch compare function.
5. After all receipts are confirmed, the app waits for the selected Somnia Agent callbacks in parallel.
6. The page displays each output side-by-side only if it came from a live LLM provider or a recoverable Somnia callback.
7. If the live provider or callback fails, the card displays a real failure state. No local mock output is shown.

This makes Compare judge-safe. It now proves payment, preserves transaction hashes, stores completed runs in History, and gives users a truthful result surface instead of hiding infrastructure failures behind fake-looking text.

## Slide 9: Receipts And Proof Packaging

Receipts now give SomniacOS a better proof story. A receipt packages key metadata around a mission or agent run:

- Receipt ID.
- Mission ID and label.
- User wallet.
- Chain ID.
- Agent chain.
- Step outputs.
- Transaction hashes.
- Token address when applicable.
- Result hash.
- Timestamp.

Receipts do not replace onchain proof. They organize it. This makes it easier for users and judges to inspect what happened after a mission or token launch.

## Slide 10: Confidence And Visual Scoring

We upgraded confidence scoring from a single number into a more explainable browser-side comparison model. This is not a claim that the output is guaranteed true. It is a usability signal based on how complete, relevant, and usable the result appears.

The score considers task specificity, constraints, output depth, live source quality, actionability, format alignment, task-agent match, and failure language. Compare now renders scoring dimensions such as relevance, constraints, depth, live source, and actionability as visual bars on each result card.

Local resilience output is explicitly capped at low confidence and is not accepted in strict Compare mode. This matters because judges should never see a mock-like fallback competing against real paid agent outputs.

## Slide 11: Saved User Context

Saved context was expanded so agents can reuse more user preference data. Users can now store project name, audience, industry, tone, risk tolerance, wallet experience, common links, preferences, and do-not-do rules.

This is important because a real agentic operating system should not treat every task as isolated. Agents need persistent user context to produce useful work over time.

The saved context feeds Workbench, Missions, and Compare.

## Slide 12: Public Agent Profiles

Agent profile pages are now real pages instead of redirects. Each profile shows:

- Agent name and role.
- Skills.
- Example tasks.
- Category.
- Task type.
- Onchain capability mapping.
- Compatible missions.
- Correct action path.

Normal agents route to Workbench. Token Launcher routes to the Launch Token mission. This gives each agent a more concrete identity inside the system.

## Slide 13: Docs Upgrade

Docs were upgraded from a single short page into a sectioned documentation system with subpages.

The new docs cover:

- Overview.
- Workbench.
- Missions.
- Launch Token.
- Compare.
- Receipts.
- Agent Profiles.
- Security and Error Recovery.
- Developer Reference.

This makes the dApp easier for judges, users, and teammates to understand. It also removes internal accounting distractions from the visible UI and docs so the product stays focused on user value and agent functionality.

## Slide 14: Navigation Cleanup

We removed internal accounting pages from the visible app navigation and from user-facing docs. The product now presents only surfaces a visitor can immediately understand and use.

The visible navigation is now:

- Agents.
- Workbench.
- Missions.
- Compare.
- Receipts.
- History.
- Docs.

This is a much stronger product story. A user sees what they can actually do, not internal accounting details.

## Slide 15: Error Recovery Improvements

We improved user-facing error recovery. Instead of showing only raw technical errors, the app now gives practical next actions:

- Install or unlock wallet.
- Approve Somnia Shannon network switch.
- Fund STT for fees and gas.
- Retry after gas estimation problems.
- Fix invalid URLs.
- Wait for pending callbacks.
- Correct token fields.

This matters because a judge or visitor should be able to recover without knowing RPC internals.

## Slide 16: Technical Architecture This Week

This week's implementation touched the core product architecture:

- `agent-engine.ts` now includes richer types for confidence, receipts, compare sessions, regular Workbench agents, docs-compatible mission flows, and helper selectors.
- `history-store.ts` now persists proof receipts, mission receipts, and compare sessions.
- `agent-workbench.tsx` now supports Workbench and Missions modes.
- New pages were added for Missions, Compare, Receipts, Docs, and Agent Profiles.
- Docs content was moved into a structured module so the docs index and docs subpages share the same source.

The build remains production-ready and deployable on Vercel.

## Slide 17: Why This Improves The Hackathon Submission

This week's changes strengthen every judging category.

For **Functionality**, the app has cleaner routes, visible task execution, mission-specific UI, token launch flow, paid compare output, receipts, docs, and better error recovery.

For **Agent-First Design**, the app now centers around agent profiles, mission templates, agent chain previews, saved context, handoffs, and paid multi-agent comparison.

For **Innovation**, SomniacOS now feels more like an agentic operating system: tasks, missions, receipts, confidence, profiles, and proof surfaces work together.

For **Autonomous Performance**, the app is more resilient because outputs are visible, pending states are clearer, errors are recoverable, and results are stored.

## Slide 18: Current Demo Flow For The Team

The recommended team demo flow is:

1. Open the landing page and explain SomniacOS as the Autonomous Economy Layer.
2. Go to Agents and show public specialist profiles.
3. Open Workbench and run a simple content or research task.
4. Open Compare, select two agents, sign the paid Somnia requests, and show side-by-side live outputs or honest failure states.
5. Open Missions and select Launch Token.
6. Show the token-specific UI and agent chain preview.
7. Open Receipts and explain proof packaging.
8. Open Docs and show the sectioned guide.

This flow shows utility, agent-first design, mission architecture, and judge readiness.

## Slide 19: New Mission Template Expansion

The mission catalog was expanded to better show SomniacOS as an operating system for both crypto and everyday work. The added templates include product comparison, DAO proposal drafting, transaction explanation, DeFi risk review, community campaign launch, meeting-to-actions, resume review, travel planning, and study planning.

These templates matter because the system should not feel limited to one hackathon demo path. SomniacOS now has a broader set of high-frequency user jobs where specialist agents can perform useful work, chain outputs, or prepare wallet-aware actions.

## Slide 20: What Is Still Next

The next improvements should focus on deeper autonomous execution:

- Multi-step mission execution where each chain step runs automatically after the previous step succeeds.
- Shareable public receipt links backed by durable storage or encoded receipt payloads.
- A future Router V3 batch compare function so two or three selected agents can be paid from one wallet signature while preserving per-agent accounting.
- More onchain event anchoring for mission receipts, compare receipts, and selected winning outputs.
- Optional persistent backend storage beyond local browser storage for public receipts and team-visible histories.
- Better indexing of Somnia callback events so the UI can recover pending runs without depending only on browser state.
- Richer mission templates for crypto operations, creator work, security review, DAO operations, and everyday productivity.

## Slide 21: Closing

SomniacOS is now positioned as more than an agent marketplace or AI wrapper. It is becoming an agentic economic operating system on Somnia.

This week we made the product cleaner, more functional, more understandable, and more defensible for judging. Workbench handles regular tasks. Missions handles structured workflows. Launch Token is correctly mission-only. Compare now requires paid Somnia requests and rejects mock fallback outputs. Receipts preserve proof. Docs explain the system. Agent profiles make the agents feel real.

The pitch is now simple: SomniacOS lets users run autonomous agent work on Somnia with useful outputs, wallet-aware actions, structured missions, and proof-ready receipts.
