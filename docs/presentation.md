# SomniacOS Presentation Draft

This document is written as a PowerPoint-ready presentation script. It is approximately 1000 words and divided into slide sections.

## Slide 1: Title

**SomniacOS: The Autonomous Economy Layer**

SomniacOS is an agentic operating system on Somnia. It lets users launch specialist AI agents through wallet-signed workflows, receive useful results, pay transparent protocol fees, and build toward a persistent onchain economy where agents can work, remember, coordinate, and transact.

The core idea is simple: users should not just chat with AI. They should be able to deploy autonomous economic work.

## Slide 2: The Problem

Most AI products are still wrappers around a model. They can write text or answer questions, but they do not behave like economic actors. They do not own process state, pay fees, create proof, route work to other agents, or maintain a visible economic trail.

Most web3 applications also remain highly manual. Users have to discover services, write tasks, inspect risk, manage treasury, create content, coordinate teams, and track outcomes themselves. This limits the usefulness of onchain systems for real autonomous work.

Somnia is built around an agentic L1 narrative. That means the strongest project should not be a normal dashboard with AI added. It should be agent-first at the system level.

## Slide 3: The Solution

SomniacOS turns agent work into an onchain operating-system workflow.

A user connects a wallet, selects a specialist agent, describes the task, optionally adds memory or web references, chooses the output format, and clicks **Run agent**. The user signs one Somnia transaction. That transaction funds the Somnia Agents workflow and pays the SomniacOS protocol fee. The result appears directly in the Workbench with provenance, transaction proof, handoffs, and next actions.

This changes the product from "AI chatbot" to "autonomous economic workflow."

## Slide 4: Product Surfaces

SomniacOS currently focuses on three high-signal surfaces.

The **Landing Page** explains the product quickly and routes users into action.

The **Agents Page** shows functional specialist agents for marketing strategy, content writing, research, code auditing, security review, treasury planning, governance drafting, negotiation, token research, wallet safety, DeFi comparison, transaction explanation, productivity, career, travel, study, and more.

The **Workbench** is the main execution shell. Users run agents, sign transactions, view outputs, copy results, inspect source labels, and continue through agent handoffs.

The **Revenue Page** shows the protocol monetization layer: 0.1 STT per workflow transaction.

## Slide 5: Why It Is Agent-First

SomniacOS is not organized around forms or static pages. It is organized around agents, missions, capabilities, memory, policies, processes, and callbacks.

Each curated agent has a role, skill list, default task, default constraints, category, and onchain capability mapping. The Workbench can route users through missions such as launching a crypto project, auditing code, researching a token, checking wallet risk, or planning a day.

After producing a result, the system generates next actions and handoffs. For example, a marketing agent can hand work to a content writer, a token researcher can hand work to a wallet risk scanner, and a code auditor can hand work to a security auditor.

This is the beginning of agent-to-agent coordination.

## Slide 6: Onchain Operating System Model

The technical model is based on operating-system primitives.

The user is the process owner. The agent is the worker. The capability is the executable permission. The policy defines boundaries like max spend and allowed capabilities. The process tracks the work. The step tracks each agent action. The memory ledger stores useful context. The fee vault collects protocol revenue. The router is the syscall interface between the dApp, Somnia contracts, and Somnia Agents.

This model is implemented through the Agentic OS Kernel contracts:

- `ProtocolFeeVault`
- `CapabilityRegistry`
- `AutonomyPolicyRegistry`
- `MemoryLedger`
- `ProcessManager`
- `SomniacAgentRouterV2`

## Slide 7: One-Transaction Workflow

The most important user flow is one transaction.

When the user clicks **Run agent**, the frontend validates the task, connects the wallet, switches to Somnia Shannon if needed, reads the total fee due, estimates gas, and sends one workflow transaction.

That transaction creates the process, applies the policy, charges the 0.1 STT protocol fee, deposits the Somnia Agents fee, creates the external agent request, and emits onchain events. When the Somnia Agents platform callbacks the router, the process step is completed and the output becomes inspectable.

The result is not just text. It is work connected to wallet, process, fee, and proof.

## Slide 8: AI Execution and Reliability

The dApp uses `/api/agents/run` as the AI execution path. The route builds an agent-specific prompt using the selected agent, task, constraints, mission, memory, output format, transaction hash, and optional fetched URLs.

If an OpenAI key is configured, the route uses OpenAI. If not, it uses a public LLM fallback. If the external provider times out, SomniacOS still returns a deterministic local agent output. This prevents the demo from failing into a blank screen.

Every output has a source label:

- `Somnia` for callback results.
- `LLM API` for model-generated results.
- `SomniacOS Local` for deterministic fallback results.

This keeps the product honest and usable.

## Slide 9: Monetization

SomniacOS has a clear revenue primitive: **0.1 STT per workflow transaction**.

The fee is charged in the same transaction as the Somnia Agents request. This avoids extra wallet friction and makes the product feel like one coherent workflow. Fees are routed through the protocol fee vault and can be surfaced in the Revenue page.

This matters because the dApp is not just a hackathon UI. It has an economic model that can scale with agent usage.

## Slide 10: Judging Criteria Alignment

For **Functionality**, SomniacOS is deployed, wallet-connectable, and usable. Visitors can run agents, sign transactions, receive visible results, and inspect outputs.

For **Agent-First Design**, agents are the center of the app. The experience is built around specialist agents, missions, capabilities, memory, handoffs, and process execution.

For **Innovation and Technical Creativity**, SomniacOS models agent work as an operating system with policies, processes, capabilities, steps, memory, callbacks, and protocol fees.

For **Autonomous Performance**, the system has resilient execution, fallbacks, result persistence, next actions, and a roadmap toward always-on runtime workers and event indexers.

## Slide 11: Future Expansion

The current Workbench is the first primitive. The next step is persistent autonomous behavior.

Agents should eventually discover other agents, negotiate prices, buy services, subcontract work, create subscriptions, form organizations, split revenue, and evolve reputation. Organizations can contain CEO agents, treasury agents, marketing agents, security agents, and analytics agents. These agents can compete, partner, merge, outsource, and adapt.

The long-term vision is autonomous AI capitalism onchain: a living machine economy on Somnia.

## Slide 12: Closing

SomniacOS demonstrates a new category of dApp: not a chatbot, not a static marketplace, and not a fake simulation.

It is an autonomous economy layer where agent work is tied to transactions, fees, memory, proof, and follow-up execution. The current product is usable today through specialist agents and the Workbench. The architecture points toward a bigger future where agents become persistent economic entities on Somnia.

SomniacOS is built to show what an Agentic L1 can make possible.
