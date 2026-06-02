# Agentic OS Kernel Workflow

The OS kernel implements a single-signature autonomous-agent workflow on top of the Somnia Agents platform. Every component in `packages/contracts/src/SomniacOSKernel.sol` exists to make one call — `SomniacAgentRouterV2.launchWorkflowAgentRun` — be **atomic**, **policy-bounded**, **fee-accounted**, and **provable** without further user interaction.

This document is the contract-level specification.

---

## 1. The One-Transaction Workflow

A user signs exactly one transaction and the chain reaches a fully wired state:

```
launchWorkflowAgentRun(policy params, process params, run params, mode) { payable }
    │
    ├── AutonomyPolicyRegistry.createPolicyFor(msg.sender, ...)        → policyId
    │        emit PolicyCreated
    │
    ├── ProcessManager.createProcessFor(msg.sender, goal, policyId, ...) → processId
    │        emit ProcessCreated
    │
    ├── ProtocolFeeVault.payFee{value: fee}(msg.sender, "workflow.run", processId, 0)
    │        emit ProtocolFeePaid
    │
    ├── _requestAgent(processId, capability, ..., mode, deposit, fee)
    │        ├── platform.createRequest{value: deposit}(...) → requestId
    │        ├── ProcessManager.registerStep(msg.sender, processId, ..., requestId, totalCost)
    │        │        emit ProcessStarted, ProcessStepRequested
    │        └── runs[requestId] = RouterRun{ Pending, ... }
    │              emit OSAgentRunRequested
    │
    └── refund (msg.value - deposit - fee) → msg.sender
```

If any single step reverts, the whole transaction reverts and the user pays only gas. There are no partially-created processes.

Once the Somnia Agents subcommittee finishes, the platform calls `SomniacAgentRouterV2.handleResponse(requestId, responses, status, request)`. That callback:

```
handleResponse(requestId, responses, status, _) external {
    require(msg.sender == address(platform));
    require(pendingRequests[requestId]);
    delete pendingRequests[requestId];

    // decode the first response, or classify TimedOut / Failed
    runs[requestId].status = ...;
    runs[requestId].result = ...;

    processManager.completeStepFromRouter(requestId, stepStatus, result);
        // → step.status = ...; process.status = Running | Failed
        // → MemoryLedger.writeMemory(processId, stepId, "result" | "error", "", result, address(this))
        // → emit ProcessStepCompleted
        // → emit ProcessFailed (on Failed only)

    emit OSAgentRunCompleted(processId, stepId, requestId, status, result);
}
```

The frontend tails `OSAgentRunCompleted` (and `MemoryWritten`) to render the proof timeline. Nothing offchain has to coordinate it.

---

## 2. Deposit Math

`getTotalDue(mode)` is the canonical amount the wallet must send.

```
getRequiredDeposit(mode) = platform.getRequestDeposit() + pricePerAgent(mode) * subcommitteeSize
getTotalDue(mode)       = getRequiredDeposit(mode) + feeVault.feeAmount()
```

For the live deployment in **LLM mode**, the verified read at `SomniacAgentRouterV2.getTotalDue(0)` returns `340000000000000000` wei = `0.34 STT`. That decomposes as:

| Component | Amount |
|-----------|--------|
| Somnia Agents `platform.getRequestDeposit()` | ~`0.04 STT` (set by the platform) |
| `llmPricePerAgent * subcommitteeSize` | `0.20 STT` (verified at deploy) |
| `ProtocolFeeVault.feeAmount` | `0.10 STT` |
| **Total** | **`0.34 STT`** |

`Website` and `JSON` modes use `websitePricePerAgent` and `jsonPricePerAgent` respectively. The platform deposit and protocol fee are mode-independent.

The router refunds `msg.value - deposit - fee` to the caller using `payable(msg.sender).call{value: refund}("")` so wallets can safely over-pay by a small buffer.

---

## 3. Policy Guards

`AutonomyPolicy` (created inside the same transaction) enforces three independent guard rails. All are checked inside `ProcessManager.registerStep`:

1. **Capability is active.** `CapabilityRegistry.isActive(capabilityId)` must return `true`.
2. **Capability is allowed by policy.** `AutonomyPolicyRegistry.isCapabilityAllowed(policyId, capabilityId)` must return `true` — the `allowedCapabilities` bitset is populated from the `bytes32[] allowedCapabilities` argument at policy creation.
3. **Spend & step budgets.** `process.stepCount < maxSteps && process.spent + totalCost <= maxSpend` must hold.

A failure on any guard reverts the entire transaction, including the upstream `platform.createRequest`. **The platform deposit and protocol fee are refunded with the rest of `msg.value`.**

The `allowChainedSteps` and `maxRetries` fields are stored in the policy and intended to be enforced by future chained-workflow logic.

---

## 4. State Machine

### Process

```
              createProcess(For)
   ┌────────────────────────────────┐
   ▼                                │
None ──▶ Created ─registerStep─▶ WaitingForCallback
                                          │
                ┌─────────────────────────┴────────────────────────┐
        Success │                                                  │ Failed | TimedOut
                ▼                                                  ▼
              Running ──registerStep──▶ WaitingForCallback        Failed
                │                                                  │
                ├── completeProcess ─▶ Completed                   │ cancelProcess
                └── cancelProcess ──▶ Cancelled  ◀─────────────────┘
```

### Step

```
None ──registerStep──▶ Pending ──completeStepFromRouter──▶ Success | Failed | TimedOut
```

`Pending` is terminal-unidirectional: a step's `result` is set exactly once, at completion. Subsequent `handleResponse` calls for the same `requestId` are rejected by `pendingRequests[requestId]`.

---

## 5. Event Index

| Event | Emitted by | Indexed args | Purpose |
|-------|-----------|--------------|---------|
| `ProtocolFeePaid(payer, actionType, processId, stepId, amount)` | ProtocolFeeVault | payer, processId, stepId | Revenue dashboard; per-action audit. |
| `PolicyCreated(policyId, owner, maxSpend, maxSteps, maxRetries, allowChainedSteps, allowedDomainsURI)` | AutonomyPolicyRegistry | policyId, owner | Policy index. |
| `ProcessCreated(processId, owner, policyId, goal, metadataURI)` | ProcessManager | processId, owner, policyId | Process index. |
| `ProcessStarted(processId)` | ProcessManager | processId | First step registered. |
| `ProcessStepRequested(processId, stepId, capabilityId, appAgentId, somniaAgentId, mode, requestId, prompt, url, totalCost)` | ProcessManager | processId, stepId, capabilityId | Cross-references chain step ↔ Somnia request. |
| `ProcessStepCompleted(processId, stepId, requestId, status, result)` | ProcessManager | processId, stepId, requestId | Per-step proof. |
| `ProcessCompleted(processId, finalSummary, resultURI)` | ProcessManager | processId | Final proof. |
| `ProcessFailed(processId, reason)` | ProcessManager | processId | Failure proof. |
| `OSAgentRunRequested(processId, stepId, requestId, user, capabilityId, appAgentId, somniaAgentId, mode, task, url, deposit, protocolFee)` | SomniacAgentRouterV2 | processId, stepId, requestId | Router-side request log. |
| `OSAgentRunCompleted(processId, stepId, requestId, status, result)` | SomniacAgentRouterV2 | processId, stepId, requestId | Router-side completion log. |
| `MemoryWritten(processId, stepId, kind, contentURI, summary, writer)` | MemoryLedger | processId, stepId, writer | Proof timeline, `kind ∈ { "result", "error", "final" }`. |

The frontend reconstructs the full proof trail for a process by joining `ProcessStepRequested`, `ProcessStepCompleted`, and `OSAgentRunCompleted` on `(processId, stepId, requestId)`.

---

## 6. Fee Accounting

Every OS write transaction pays `0.1 STT` into `ProtocolFeeVault`, identified by `actionType`:

| `actionType` | Charged by | When |
|--------------|-----------|------|
| `policy.create` | `AutonomyPolicyRegistry.createPolicy` | Direct (non-workflow) policy creation. |
| `process.create` | `ProcessManager.createProcess` | Direct process creation. |
| `workflow.run` | `SomniacAgentRouterV2.launchWorkflowAgentRun` | One-transaction workflow. **This replaces `policy.create` + `process.create`** — the router does not double-charge. |
| `process.step` | `SomniacAgentRouterV2.requestProcessAgentRun` | Additional step on an existing process. |

`ProtocolFeeVault.totalCollected` is a monotonic counter — it does *not* decrease when `withdraw` is called. The current balance is `address(this).balance`.

The Revenue page at `/app/revenue` reads `totalCollected`, `feeAmount`, and `feeRecipient` directly from the vault to display a live revenue figure that survives event-window scrolling.

---

## 7. Deployment Wiring

`scripts/deploy-os-kernel.ts` deploys the kernel in dependency order and wires the post-deploy permissions:

```ts
// 1. Deploy
const feeVault            = await deploy("ProtocolFeeVault",        [feeRecipient]);
const capabilityRegistry  = await deploy("CapabilityRegistry",      []);
const policyRegistry      = await deploy("AutonomyPolicyRegistry",  [feeVault.address]);
const memoryLedger        = await deploy("MemoryLedger",            []);
const processManager      = await deploy("ProcessManager",          [feeVault.address, policyRegistry.address, capabilityRegistry.address, memoryLedger.address]);
const router              = await deploy("SomniacAgentRouterV2",    [platform, processManager.address, policyRegistry.address, feeVault.address, llmAgentId, websiteAgentId, jsonAgentId, subcommitteeSize, llmPricePerAgent, websitePricePerAgent, jsonPricePerAgent]);

// 2. Wire
await write("ProcessManager",          processManager.address, "setRouter",          [router.address]);
await write("AutonomyPolicyRegistry",  policyRegistry.address, "setWorkflowCreator", [router.address]);
await write("MemoryLedger",            memoryLedger.address,   "setProcessManager",  [processManager.address]);

// 3. Seed capabilities
for (const c of defaultCapabilities) {
  await write("CapabilityRegistry", capabilityRegistry.address, "registerCapability",
    [keccak256(toHex(c.id)), c.label, c.description, c.mode, BigInt(c.somniaAgentId), c.schemaURI]);
}
```

Result is persisted to `packages/config/deployments/somnia-shannon.json` and the addresses are mirrored into `apps/web/lib/contracts.ts` (`osContracts`).

---

## 8. Failure Examples

| Symptom | Likely cause | Where to look |
|---------|--------------|---------------|
| `not workflow creator` revert | `AutonomyPolicyRegistry.workflowCreator` is not `SomniacAgentRouterV2`. | Re-run `setWorkflowCreator`. |
| `not router` revert in `ProcessManager` | `ProcessManager.router` does not match the live router address. | Re-run `setRouter`. |
| `capability blocked` revert | `allowedCapabilities` did not include the `capabilityId` you used. | Add the id to the `bytes32[] allowedCapabilities` argument. |
| `max spend` / `max steps` revert | Policy quota exhausted. | Raise `maxSpend` / `maxSteps` on a new policy or use `updatePolicy`. |
| `underfunded` revert | `msg.value < deposit + fee`. | Call `getTotalDue(mode)` and send at least that amount. |
| Process stuck in `WaitingForCallback` | Somnia Agents subcommittee has not reached consensus. | Wait; or after deadline, expect `TimedOut` callback. |
| Result reads `"Somnia Agent request failed before producing a usable result."` | Subcommittee reached `ResponseStatus.Failed` with no decodable result. | Inspect the platform-side request via the request id. |

---

## 9. Verified Reads (current deployment)

These reads were verified against the live deployment and serve as smoke-test baselines:

```text
ProtocolFeeVault.feeAmount()       = 100000000000000000      // 0.1 STT
ProtocolFeeVault.feeRecipient()    = 0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E
SomniacAgentRouterV2.getTotalDue(0) = 340000000000000000      // 0.34 STT (LLM)
AutonomyPolicyRegistry.workflowCreator() = SomniacAgentRouterV2 address
CapabilityRegistry.getCapabilityCount()  = 8                  // content.write, marketing.strategy, research.web,
                                                              // research.api, audit.code, treasury.plan,
                                                              // governance.draft, security.monitor
ProcessManager.router()           = SomniacAgentRouterV2 address
```

Any divergence indicates a stale deployment or a mis-wired post-deploy step.
