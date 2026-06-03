# SomniacOS Concept and Technical Submission

## 1. Executive Summary

SomniacOS is **The Autonomous Economy Layer** for Somnia: a persistent onchain operating environment where specialist AI agents can be invoked by users, route work to other agents, maintain memory, generate useful outputs, anchor proof through wallet-signed transactions, and create a visible economic trail on Somnia Shannon Testnet.

The project is intentionally not a chatbot wrapper, static marketplace, or simulated dashboard. It is designed as an **Agentic Economic Operating System**: a dApp where users interact with agents as working economic actors. A visitor connects a wallet, chooses a specialist agent, describes a task, signs one transaction, and receives a visible result with provenance, follow-up actions, and onchain proof. The application charges a protocol fee of **0.1 STT per workflow transaction** through `ProtocolFeeVault`, while the same user transaction also funds the Somnia Agents request path.

SomniacOS is built around one principle: **no fake state**. Visitor-visible economic claims come from the connected wallet, deployed Somnia contracts, decoded events, direct contract reads, or explicit user input. Agent outputs are labelled by provenance: `Somnia`, `LLM API`, or `SomniacOS Local`, so judges can see whether a response came from an onchain callback, an LLM provider, or the deterministic resilience fallback.

Live dApp: `https://somniacos.vercel.app`

Chain: Somnia Shannon Testnet, chain id `50312`

Primary app surfaces: `Agents`, `Workbench`, `Revenue`

## 2. Core Vision

The long-term vision is a living autonomous AI economy running onchain. In this world:

- AI agents live as persistent identities.
- Agents own wallets and operate with budgets.
- Agents provide services to humans and other agents.
- Agents can hire, negotiate, subcontract, and form organizations.
- Agent work produces revenue, reputation, memory, and proof.
- The economy continues to produce activity even when individual users leave.

SomniacOS converts that concept into a functional dApp by focusing on the first high-impact primitive: **signed agent work**. A user does not merely ask a model a question. A user launches a workflow where an agent task is tied to a wallet, a transaction, a fee, a process id, a capability, and an inspectable result.

This is the operating-system framing:

- The **user** is the process owner.
- The **agent** is the worker process.
- The **capability** is the executable permission.
- The **policy** is the runtime boundary.
- The **fee vault** is the system revenue account.
- The **memory ledger** is the persistent context layer.
- The **router** is the syscall interface between frontend, Somnia Agents, and OS contracts.
- The **workbench** is the shell where users launch and inspect agent work.

## 3. Product Experience

The dApp is intentionally reduced to the surfaces judges and visitors need:

### Landing Page

The landing page pitches SomniacOS in a minimal, clean format. It explains that SomniacOS is an autonomous economy layer, shows the live product direction, and routes visitors into the Workbench without burying them in unnecessary dashboards.

### Agents Page

The Agents page lists functional specialist agents. The goal is not to let users create arbitrary fake agents, but to provide useful preconfigured agents that perform real tasks. Current agent categories include:

- Marketing strategy
- Content writing
- Research
- Code auditing
- Security auditing
- Treasury planning
- Governance drafting
- Negotiation
- Token research
- Wallet risk scanning
- DeFi yield comparison
- Transaction explanation
- Portfolio planning
- Airdrop planning
- Email writing
- Travel planning
- Study tutoring
- Career coaching
- Meeting summarization
- Productivity planning

Each agent has a role, skill list, promise, default task, default constraints, category, and mapping to onchain capability families.

### Agent Workbench

The Workbench is the main application. A user can:

1. Connect a wallet.
2. Select a mission or specialist agent.
3. Add task instructions and constraints.
4. Optionally provide URLs for reference fetching.
5. Save memory such as project name, audience, context, and preferences.
6. Select an output format.
7. Click **Run agent**.
8. Sign one Somnia transaction.
9. Receive the generated result directly on the page.
10. Inspect transaction proof, source provenance, handoffs, and next actions.

The Workbench supports multiple output formats:

- Auto
- X post
- Thread
- Brief
- Audit
- Checklist
- Email
- Plan

This lets the same agent runtime produce different useful artifacts rather than generic prose.

### Anchored Results

The Anchored Results section shows completed agent outputs. Results are persisted in local run history and cross-referenced with Somnia callback events when available. The user can copy the result, inspect the source, follow handoff buttons, and continue the mission.

### Revenue

The Revenue page reads protocol fee activity. The protocol fee target is **0.1 STT per workflow transaction**, routed to `ProtocolFeeVault`. This page is important because it proves SomniacOS is not only a UI experiment; it has a monetization primitive.

## 4. Technical Architecture

SomniacOS is a monorepo organized into application, contract, shared-model, and documentation workspaces.

```text
somniacos/
  apps/
    web/        Next.js dApp, API routes, wallet UI
    runtime/    persistent autonomous loop scaffold
    indexer/    contract event indexer scaffold
    api/        API surface descriptor
  packages/
    contracts/  Solidity contracts and Foundry tests
    shared/     seeded domain model and economy primitives
    agents/     agent policy primitives
    config/     deployment config and artifacts
    db/         Postgres schema with pgvector support
    ui/         shared UI package placeholder
  scripts/      deployment, seed, and healthcheck tools
  docs/         technical documentation
```

The deployed frontend runs on Vercel. It uses Next.js 15, TypeScript, Tailwind CSS, viem, wallet injection, server API routes, and Somnia RPC reads. The frontend is deliberately stateless: persistent economic data is either onchain, in the connected wallet, or in local storage for user-owned memory and run history. Long-running components such as autonomous runtime and indexer are kept in separate workspaces because serverless functions are not suitable for persistent always-on behavior.

## 5. Onchain Architecture

SomniacOS has two contract layers.

### Core Economy Contracts

The first layer models the autonomous economy:

- `AgentRegistry`: agent identity.
- `OrganizationRegistry`: AI company and organization identity.
- `Marketplace`: tasks and service requests.
- `NegotiationRegistry`: proposals and terms.
- `Escrow`: task payment custody.
- `Reputation`: reliability and quality updates.
- `SubscriptionManager`: recurring service agreements.
- `Treasury`: organization funds.
- `Governance`: proposals and votes.
- `PartnershipRegistry`: partnerships between entities.
- `WorldEventRegistry`: public world activity events.
- `SomniacAgentRouter`: first-generation Somnia Agents router.

### Agentic OS Kernel

The second layer turns the economy into an operating system:

- `ProtocolFeeVault`: collects protocol fees.
- `CapabilityRegistry`: maps executable capabilities to Somnia Agent modes and ids.
- `AutonomyPolicyRegistry`: stores max spend, max steps, allowed capabilities, and allowed domains.
- `MemoryLedger`: records memory and result references.
- `ProcessManager`: stores processes, steps, statuses, spending, and outputs.
- `SomniacAgentRouterV2`: one-transaction workflow entrypoint.

The critical function is `launchWorkflowAgentRun`. It atomically creates or references the runtime policy, creates an OS process, charges the protocol fee, deposits the Somnia Agents fee, calls the Somnia Agents platform, and emits an `OSAgentRunRequested` event. When the Somnia Agents platform returns a callback, the router completes the step, writes output status, and emits `OSAgentRunCompleted`.

## 6. Agent Runtime Model

SomniacOS treats each agent as a specialist worker with a defined role and task boundary. The current frontend runtime supports:

- Curated agent identities.
- Mission presets.
- Output format selection.
- User-owned memory.
- URL reference fetching.
- LLM execution.
- Public provider fallback.
- Deterministic local fallback.
- Handoffs to other agents.
- Next-action generation.
- Result provenance.

The intended persistent runtime follows the loop:

```text
Observe -> Think -> Plan -> Negotiate -> Execute -> Reflect -> Learn -> Broadcast
```

In production, each loop step maps to real state:

- `observe`: read marketplace, treasury, and world events.
- `think`: combine memory and recent context.
- `plan`: choose next economic action.
- `negotiate`: create or respond to proposals.
- `execute`: trigger payments, task actions, or agent runs.
- `reflect`: write useful memory.
- `learn`: adjust pricing, risk, or routing heuristics.
- `broadcast`: emit a world event.

This architecture supports future agent-to-agent commerce without changing the basic operating-system model.

## 7. AI and Web Fetch Path

The `/api/agents/run` route is the main AI execution path. It accepts:

```json
{
  "agentId": "content-writer",
  "missionId": "crypto-founder-launch",
  "outputFormat": "x-post",
  "task": "Write one short X post about agentic dapps.",
  "constraints": "Under 280 characters.",
  "memory": {
    "projectName": "SomniacOS",
    "audience": "Somnia hackathon judges",
    "context": "Autonomous onchain agent economy",
    "preferences": "Clear and professional"
  },
  "urls": [],
  "requestId": "verify",
  "txHash": "0x..."
}
```

The route builds a role-specific system prompt from the selected agent, task, constraints, memory, output format, transaction hash, and fetched references. If `OPENAI_API_KEY` exists, it uses the OpenAI Responses API. If OpenAI is not configured, it uses a public LLM fallback. If that provider times out or fails, it returns a deterministic local agent response so the user still receives a visible deliverable.

The system is honest about provenance:

- `source: "LLM API"` means the response came from OpenAI or the public fallback.
- `source: "SomniacOS Local"` means the external model path failed and a deterministic fallback produced a useful working result.
- `source: "Somnia"` means the result came from a Somnia callback event.

This avoids fake success states while still keeping the product usable.

## 8. Wallet and Transaction Flow

SomniacOS is non-custodial. The app does not sign transactions for users. The visitor connects a wallet through injected wallet providers such as MetaMask, Rabby, Brave, or Coinbase Wallet. If the wallet is not on Somnia Shannon, the app attempts to switch or add the correct chain.

When a user clicks **Run agent**, the frontend:

1. Validates the task.
2. Ensures the wallet is connected.
3. Ensures the wallet is on Somnia Shannon.
4. Reads the total amount due from `SomniacAgentRouterV2.getTotalDue`.
5. Encodes the workflow call.
6. Estimates gas and applies a buffer.
7. Sends the transaction with `msg.value = platform fee + protocol fee`.
8. Waits for receipt.
9. Runs the server agent output path.
10. Polls or reconstructs callback results.
11. Saves and displays the result.

The fee is not a separate second transaction. The protocol fee and Somnia Agents fee are paid together inside the same workflow transaction.

## 9. Data Model and State Provenance

SomniacOS uses four kinds of state:

### Onchain State

Economic and proof state lives in deployed Somnia contracts. This includes protocol fees, process ids, step ids, request ids, callbacks, world events, and revenue totals.

### Wallet State

The connected wallet provides the user's address, network, transaction signing, and STT balance.

### Server-Read State

Next.js API routes read Somnia events and contract state using viem public clients. These routes never mutate chain state.

### Local User State

The Workbench stores user memory and run history in browser local storage. This is not used to fake contract state. It is used so a visitor can refresh the page and still see their own recent agent results and saved context.

## 10. Error Handling and Reliability

The product includes explicit error handling because judge demos fail when users do not know what happened. Error handling covers:

- Invalid or empty tasks.
- Task and constraint length limits.
- Wallet not connected.
- Wrong network.
- Wallet rejection.
- Insufficient STT.
- Gas estimation problems.
- Somnia RPC timeouts.
- Provider timeouts.
- Empty LLM output.
- Missing callback.
- Delayed event indexing.

The UI provides next actions instead of raw stack traces. For example, insufficient STT prompts the user to fund Somnia Shannon; wrong network prompts the app to switch; provider timeout still returns a visible local agent output.

## 11. Monetization

SomniacOS monetizes agent workflow transactions through a protocol fee of **0.1 STT per transaction**. The fee is routed to:

```text
Revenue wallet: 0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E
```

The kernel design keeps this monetization transparent:

- Fees are charged onchain.
- Fees are paid during the same user transaction as the agent request.
- Fee events can be decoded and displayed.
- Revenue totals can be read from `ProtocolFeeVault`.

This creates a scalable business model: as agent workflows become more valuable, the protocol earns per execution while preserving transparent onchain accounting.

## 12. Somnia Judging Criteria Alignment

### Functionality

SomniacOS is deployed, wallet-connectable, and capable of executing agent tasks from the public Workbench. It has deployed contracts, typed ABIs, Vercel production deployment, error handling, and result visibility.

### Agent-First Design

The dApp is centered on agents, not forms. Users choose specialist agents, run missions, receive outputs, continue via handoffs, and interact with Somnia Agents through the router. Capabilities and policies are agent-native primitives.

### Innovation and Technical Creativity

The operating-system framing is novel: agent work is modeled as policies, processes, capabilities, steps, memory, fees, and callbacks. This turns agent execution into a composable onchain runtime rather than a plain chat UI.

### Autonomous Performance

The project includes the architecture for always-on runtime behavior and already implements a robust execution pipeline with fallbacks, handoffs, memory, next actions, event-derived results, and process tracking. The product remains usable under provider failure instead of collapsing into blank states.

## 13. Demo Script

1. Open `https://somniacos.vercel.app`.
2. Explain the thesis: SomniacOS is the autonomous economy layer for Somnia.
3. Open `Agents` and show specialist agents for crypto, work, builder, and life tasks.
4. Open `Workbench`.
5. Select a mission such as `Launch my crypto project`.
6. Fill memory: project name, audience, context, and preferences.
7. Select output format.
8. Click **Run agent**.
9. Sign the Somnia transaction.
10. Show the generated output.
11. Show source provenance and signed transaction proof.
12. Show handoff buttons and next actions.
13. Open `Revenue` and explain the 0.1 STT protocol fee.
14. Close with the larger vision: agent-to-agent commerce, autonomous companies, and persistent AI economies.

## 14. Why This Matters

Most AI dApps are wrappers around a model. Most onchain marketplaces still depend on humans to discover work, negotiate, pay, and coordinate. SomniacOS combines these two worlds into a system where agents become economic participants.

The important primitive is not just "AI can answer questions." The important primitive is:

```text
AI can perform economically meaningful work under a policy, through a wallet-signed transaction, with a fee, proof, memory, and follow-up actions.
```

That primitive can grow into AI labor markets, autonomous SaaS businesses, decentralized AI corporations, machine-to-machine commerce, and onchain agent economies. SomniacOS is the first implementation step toward that operating system.
