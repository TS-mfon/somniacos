# SomniacOS Concepts

This file is the submission-ready concept document for SomniacOS. It mirrors and expands `docs/concept.md` so reviewers can open a single root-level project file without navigating the full documentation tree.

## Project Name

SomniacOS

## Tagline

The Autonomous Economy Layer

## One-Sentence Description

SomniacOS is an agentic operating system on Somnia where users launch specialist AI agents through wallet-signed workflows, receive visible task outputs, pay transparent protocol fees, and build toward a persistent onchain economy of agents, memory, reputation, organizations, and autonomous work.

## Problem

Most AI products are still chat interfaces. They can produce text, but they rarely behave like autonomous economic actors. Most onchain applications are also still human-operated: users manually discover opportunities, manually hire service providers, manually inspect risk, manually write content, manually manage treasury, and manually coordinate work.

This creates a gap. If Somnia is built for agentic execution, then the winning dApp should not merely place a chatbot inside a web3 interface. It should make agents first-class actors in an economy.

SomniacOS solves this by turning agent work into an onchain operating-system workflow.

## Solution

SomniacOS provides a dApp where a user can:

1. Connect a wallet.
2. Select a specialist agent.
3. Define a task.
4. Add constraints and memory.
5. Sign one Somnia transaction.
6. Receive the agent output visibly on the page.
7. Inspect transaction proof and provenance.
8. Continue through agent handoffs and next actions.

The key product shift is that users are not simply chatting. They are launching workflow processes inside an agentic economy. Each run has a user, task, capability, fee, transaction, output, and proof trail.

## Product Surfaces

### Landing Page

The landing page explains SomniacOS cleanly and routes visitors toward useful action. It avoids clutter and focuses on the core thesis: SomniacOS is where autonomous agents perform economic work on Somnia.

### Agents

The Agents page lists usable specialist agents. The project deliberately removed arbitrary fake agent creation from the visitor flow and replaced it with purpose-built agents for real tasks. Current agents include:

- Marketing Strategist
- Content Writer
- Research Analyst
- Code Auditor
- Security Auditor
- Treasury Planner
- Governance Drafter
- Negotiation Agent
- Token Research Analyst
- Wallet Risk Scanner
- DeFi Yield Scout
- Transaction Explainer
- Portfolio Planner
- Airdrop Quest Planner
- Email Writer
- Travel Planner
- Study Tutor
- Career Coach
- Meeting Summarizer
- Productivity Planner

### Workbench

The Workbench is the main shell. It lets users run an agent, sign the transaction, receive results, view proof, copy outputs, and continue with handoffs. It supports mission presets, output formats, saved memory, URL references, error recovery, transaction state, and anchored results.

The `Launch Token` mission adds a non-custodial deployment flow. The agent prepares token parameters and explains the risk. The connected wallet signs a transaction to `SomniacTokenFactory`. After confirmation, the dApp decodes the receipt and shows token address, owner, supply, and transaction proof. Users never share private keys.

### History

The History page keeps the Workbench clean by moving completed outputs, receipts, token launches, and previous mission records into a separate archive. The Workbench focuses on active execution; History focuses on review, proof, copying outputs, and explorer links.

### Revenue

The Revenue page shows the protocol fee primitive. SomniacOS charges **0.1 STT per workflow transaction**, routed through the onchain fee vault. This creates a clear monetization model while keeping fee accounting transparent.

## Agent Types

SomniacOS supports the broader agent economy described in the original project thesis:

- Worker agents perform tasks such as copywriting, research, analytics, auditing, and planning.
- Manager agents coordinate other agents and optimize workflows.
- Market agents negotiate prices, discover opportunities, and route work.
- Governance agents draft proposals, manage policies, and evaluate disputes.
- Social agents build partnerships and track reputation.
- Security agents monitor exploits, fraud, suspicious transactions, and risk.

The current dApp focuses on functional specialist agents. The architecture supports expansion toward agent-to-agent commerce.

## System Layers

SomniacOS is organized as five layers.

### Identity Layer

Agents and organizations need durable identities. The core economy contracts include registries for agents and organizations. These establish the base existence layer for the autonomous economy.

### Intelligence Layer

Agents use LLM execution, prompt construction, memory, task constraints, URL references, output formats, and handoff graphs. The runtime is designed around specialist behavior rather than one generic assistant.

### Economic Layer

The system includes payment and ownership primitives: fee vault, treasury, escrow, subscriptions, and marketplace contracts. The current Workbench charges a protocol fee through the OS kernel workflow.

### Coordination Layer

Agents coordinate through missions, handoffs, next actions, negotiation registry primitives, marketplace tasks, and future runtime loops.

### Civilization Layer

The long-term layer is an emergent world of autonomous businesses, reputation changes, partnerships, disputes, organizations, and world events.

## Technical Architecture

SomniacOS is a TypeScript and Solidity monorepo.

```text
apps/web        Next.js 15 dApp, API routes, wallet UI
apps/runtime    persistent autonomous loop scaffold
apps/indexer    contract event indexer scaffold
packages/contracts Solidity contracts and Foundry tests
packages/shared shared domain model
packages/db     Postgres schema with pgvector support
docs            technical documentation
scripts         deploy, seed, healthcheck, Vercel helpers
```

The public dApp is hosted on Vercel. The frontend uses wallet injection and viem for Somnia interactions. API routes read chain state and execute agent requests. Long-running runtime/indexer services are separated from Vercel because they need persistent hosting.

## Onchain Components

Core contracts:

- `AgentRegistry`
- `OrganizationRegistry`
- `Marketplace`
- `NegotiationRegistry`
- `Escrow`
- `Reputation`
- `SubscriptionManager`
- `Treasury`
- `Governance`
- `PartnershipRegistry`
- `WorldEventRegistry`
- `SomniacAgentRouter`

OS kernel contracts:

- `ProtocolFeeVault`
- `CapabilityRegistry`
- `AutonomyPolicyRegistry`
- `MemoryLedger`
- `ProcessManager`
- `SomniacAgentRouterV2`

These contracts allow the project to represent agent identity, processes, capabilities, memory, fees, callbacks, and economic actions onchain.

## One-Transaction Workflow

The Workbench is designed around a single signed transaction. When a user runs an agent, the app calls `SomniacAgentRouterV2.launchWorkflowAgentRun`. This workflow:

1. Validates capability and policy boundaries.
2. Creates or uses an autonomy policy.
3. Creates an OS process.
4. Charges the 0.1 STT protocol fee.
5. Deposits the Somnia Agents fee.
6. Creates a Somnia Agents request.
7. Emits request events.
8. Waits for callback.
9. Records the completed step.
10. Emits completion events.

This creates a strong judging demo because it is not a fake static result. A wallet signs the transaction, the protocol fee is accounted for, and the user receives a visible output with provenance.

## AI Execution Path

The `/api/agents/run` route builds an agent-specific prompt from:

- selected agent
- role
- category
- skill list
- task
- constraints
- mission id
- output format
- saved memory
- request id
- transaction hash
- fetched URL references

If `OPENAI_API_KEY` is configured, the route uses OpenAI. If not, it uses a public LLM fallback. If the public fallback times out, it returns a deterministic local response. This is important because demos should not fail into a blank state when a provider is slow.

## Provenance

Every result has a source:

- `Somnia`: result from a Somnia callback.
- `LLM API`: result from OpenAI or public LLM fallback.
- `SomniacOS Local`: deterministic fallback used when external providers fail.

This keeps the product honest while preserving usability.

## Monetization

SomniacOS monetizes per workflow transaction:

```text
Protocol fee: 0.1 STT
Revenue wallet: 0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E
```

The fee is charged inside the same workflow transaction as the Somnia Agents fee. This avoids forcing users to sign separate payment transactions and makes accounting cleaner.

## Judging Criteria Alignment

### Functionality

The project is deployed, wallet-connectable, and usable. Users can run agents, sign transactions, receive results, inspect proof, and view revenue state.

### Agent-First Design

Agents are the central product surface. The app is organized around specialist agents, missions, capabilities, handoffs, memory, and workflow execution.

### Innovation and Technical Creativity

The project frames agent execution as an operating system: policies, processes, capabilities, steps, callbacks, memory, and fee accounting. This is more novel than a normal AI marketplace.

### Autonomous Performance

SomniacOS includes the architecture for autonomous runtime behavior and implements reliable agent execution with fallbacks, result persistence, handoffs, and process-based proof trails.

## Roadmap

Short-term:

- Add more agent missions.
- Improve provider reliability with production LLM keys.
- Add richer process detail pages.
- Add deeper callback polling and event indexing.

Medium-term:

- Deploy persistent runtime worker.
- Deploy persistent indexer.
- Add agent-to-agent task routing.
- Add organization-owned agent teams.
- Add reputation scoring from completed work.

Long-term:

- Autonomous companies.
- Agent-owned wallets.
- Machine-to-machine service commerce.
- Self-forming partnerships.
- Recurring subscriptions between agents.
- Full onchain economic simulation layer.

## Final Thesis

SomniacOS is a new primitive for Somnia: a system where AI agents become economic actors rather than passive assistants. It demonstrates how Somnia can support persistent, agent-native applications where actions, fees, memory, and outputs are connected to the chain. The project is designed to be useful immediately through the Workbench, while also pointing toward a much larger future: autonomous AI economies operating onchain.
