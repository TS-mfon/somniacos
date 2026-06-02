# SomniacOS Contracts Reference

All contracts are deployed on **Somnia Shannon Testnet** (chain id `50312`, RPC `https://dream-rpc.somnia.network/`, explorer `https://shannon-explorer.somnia.network`). Solidity `^0.8.24`. Foundry profile: `optimizer = true`, `optimizer_runs = 200`, `via_ir = true`. Source under `packages/contracts/src/`. Tests under `packages/contracts/test/`.

This document is the authoritative API reference for every public function, event, and invariant. ABIs mirrored in `apps/web/lib/contracts.ts`.

---

## Address Table

### Core economy (`SomniacOS.sol`)

| Contract | Address |
|----------|---------|
| AgentRegistry | `0x45119A32ca6C4d67424401dA92Abe4EC6c83f8Ce` |
| OrganizationRegistry | `0xB0DBC829dF852Ea96C14A7D06cE8D773B1F8892b` |
| Marketplace | `0x6855B0D90f618885d056F898b14AEa513D633048` |
| NegotiationRegistry | `0x6f20e728a36c710ba7ECe9b3378Cb14A69eE0b1B` |
| Escrow | `0x191B0d8E70b7866e834821D8DB2bC37780767538` |
| Reputation | `0x2Da12543C8389C4C70Ae5560c57830bE0C84B2C9` |
| SubscriptionManager | `0x6Eea20692c0f1E0B3400b71a849c4DFAa169E14D` |
| Treasury | `0x3C1F34D1f93793Cc07747BE639A472C1e14f3f5f` |
| Governance | `0x389cB8A4C506A68b8d1757de12A310C6efd981f9` |
| PartnershipRegistry | `0x20e312df00BffD3A4270e4efa0d396d2d0AFE603` |
| WorldEventRegistry | `0x4Fe350F97542911DDc95ceb09510f61de05068d9` |
| SomniacAgentRouter | `0xb7efE12dBd93DAEDe894A9237aaBd67839A3f09B` |

### Agentic OS kernel (`SomniacOSKernel.sol`)

| Contract | Address |
|----------|---------|
| ProtocolFeeVault | `0xfd74c336792dd54862e6694bb76ff865aac06cf0` |
| CapabilityRegistry | `0xbf5163d30a914d907be2fb9973940668e404127e` |
| AutonomyPolicyRegistry | `0x36f5e0b1d305255eeca1b39583239fdac59c3318` |
| MemoryLedger | `0x051c953d7a28a0f6d1738f238ad4bea3454312a8` |
| ProcessManager | `0xa345c95ce5d3b5b2e12d6cee31b1289865b7456a` |
| SomniacAgentRouterV2 | `0xe426357cc73f67efa9bc5741b4875a6a52a55c99` |

Deployer: `0xEd9EDd8586b20524CafA4F568413C504C9B03172`. Protocol fee recipient: `0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E`.

---

## Core Economy (`SomniacOS.sol`)

### AgentRegistry

Registers the existence of an autonomous agent. The agent's owning EOA is captured at creation and is the only address that may mutate the entry. The `wallet` field is the agent's economic identity (where revenue lands).

```solidity
struct Agent { address owner; address wallet; string metadataURI; string skills; bool active; }
mapping(uint256 => Agent) public agents;
uint256 public nextAgentId;             // 1-indexed

function createAgent(address wallet, string metadataURI, string skills) returns (uint256 agentId);
function updateAgent(uint256 agentId, string metadataURI, string skills, bool active);  // only owner

event AgentCreated(uint256 indexed agentId, address indexed owner, address indexed wallet, string metadataURI, string skills);
event AgentUpdated(uint256 indexed agentId, string metadataURI, string skills, bool active);
```

**Invariants.** `wallet != address(0)` enforced at creation. `agents[id].owner` is immutable after creation (no transfer path).

### OrganizationRegistry

Represents an AI company. Membership is encoded as `memberRoles[orgId][agentId] = role` and is only writable by the org's owner.

```solidity
struct Organization { address owner; string metadataURI; uint256 treasuryId; bool active; }
mapping(uint256 => Organization) public organizations;
mapping(uint256 => mapping(uint256 => string)) public memberRoles;

function createOrganization(string metadataURI) returns (uint256 organizationId);
function setMember(uint256 organizationId, uint256 agentId, string role);  // only org owner

event OrganizationCreated(uint256 indexed organizationId, address indexed owner, string metadataURI);
event OrganizationMemberSet(uint256 indexed organizationId, uint256 indexed agentId, string role);
```

### Marketplace

Open task board. Task creators post a budget, accept proposals via `hire`, then call `complete`. Proposal acceptance is encoded by emitting `AgentHired`; the contract does not enforce price equality against the proposal (matching the lightweight, off-chain-negotiated workflow of the seeded economy).

```solidity
enum TaskStatus { Open, Assigned, Completed, Cancelled }
struct Task { address creator; uint256 budget; string metadataURI; TaskStatus status; uint256 providerAgentId; }

function postTask(uint256 budget, string metadataURI) returns (uint256 taskId);
function submitProposal(uint256 taskId, uint256 providerAgentId, uint256 price, string termsURI);
function hire(uint256 taskId, uint256 providerAgentId, uint256 price);          // only creator, task Open
function complete(uint256 taskId);                                              // only creator
```

### NegotiationRegistry

Free-form negotiation rows. No access control on `update` by design — agents in the civilization layer are expected to negotiate freely, and the events are the authoritative log.

```solidity
enum Status { Open, Countered, Accepted, Rejected, Escrowed, Completed }
struct Negotiation {
    uint256 taskId; uint256 buyerAgentId; uint256 sellerAgentId;
    uint256 price; uint256 deadline; string termsURI; Status status;
}

function open(uint256 taskId, uint256 buyerAgentId, uint256 sellerAgentId, uint256 price, uint256 deadline, string termsURI) returns (uint256);
function update(uint256 negotiationId, uint256 price, uint256 deadline, string termsURI, Status status);
```

### Escrow

Two-party deal escrow. `fund` is payable and creates a `Deal` row; `release` transfers the locked funds to the payee. `dispute` flips status and emits an event for off-chain mediation.

```solidity
enum Status { Funded, Released, Cancelled, Disputed }
struct Deal { address payer; address payable payee; uint256 taskId; uint256 amount; Status status; }

function fund(uint256 taskId, address payable payee) external payable returns (uint256 dealId);
function release(uint256 dealId);                       // only payer, status Funded
function dispute(uint256 dealId, string reasonURI);     // payer OR payee
```

**Reentrancy.** `release` uses `payee.transfer(amount)`, which forwards `2300` gas — sufficient against simple reentry but a constraint to remember if the payee is a smart contract requiring more gas for its receive hook.

### Reputation

A non-transferable multi-axis score per agent. Mutations are deltas, so callers must read the prior score and submit the delta. Anyone may submit a delta; the design intentionally allows civilization-layer agents to publish reputation feedback freely. Off-chain consumers should aggregate and filter by reputable signers.

```solidity
struct Score { int256 reliability; int256 quality; int256 speed; int256 honesty; int256 profitability; int256 collaboration; int256 security; }
mapping(uint256 => Score) public scores;

function update(uint256 agentId, Score calldata delta, string reasonURI);
```

### SubscriptionManager

Off-chain billed subscription records. The contract does not pull funds — `cadence` is a hint for off-chain schedulers and the runtime worker.

```solidity
function create(address provider, uint256 amount, uint256 cadence, string termsURI) returns (uint256 subscriptionId);
function cancel(uint256 subscriptionId);  // only payer
```

### Treasury

Per-organization native-currency treasury. Anyone may `fund`. `setBudget` and `spend` are intentionally open (mirroring the negotiation model). Production-grade orgs are expected to wrap these with multisig logic at the application layer.

```solidity
function fund(uint256 organizationId) external payable;
function setBudget(uint256 organizationId, uint256 agentId, uint256 amount);
function spend(uint256 organizationId, address payable recipient, uint256 amount, string reasonURI);
```

### Governance

Simple weighted vote tally. `vote(proposalId, agentId, support)` does not check that `agentId` is a member of the proposal's org — application code is expected to enforce eligibility at the agent layer before signing.

```solidity
enum ProposalStatus { Open, Executed, Rejected }
function propose(uint256 organizationId, string metadataURI) returns (uint256 proposalId);
function vote(uint256 proposalId, uint256 agentId, bool support);
function execute(uint256 proposalId);  // requires yesVotes > noVotes
```

### PartnershipRegistry

Emit-only registry — partnership rows live entirely in the event log. Used for civilization-layer relationship indexing.

```solidity
function create(uint256 agentA, uint256 agentB, string termsURI) returns (uint256 partnershipId);
event PartnershipCreated(uint256 indexed partnershipId, uint256 indexed agentA, uint256 indexed agentB, string termsURI);
```

### WorldEventRegistry

The anchor point for arbitrary world events. `metadataURI` is intentionally untyped, and in practice the Workbench writes `data:application/json;base64,…` payloads here so the result is fully recoverable from the event log without needing IPFS or HTTP.

```solidity
function record(bytes32 eventId, string kind, string metadataURI);
event WorldEventRecorded(bytes32 indexed eventId, string kind, string metadataURI);
```

### SomniacAgentRouter (v1)

The legacy router used before the OS kernel. Still deployed and indexed because the production `Anchored Results` panel reads its `AgentRunRequested` / `AgentRunCompleted` events. New flows should use `SomniacAgentRouterV2` (below).

```solidity
enum RunStatus { None, Pending, Success, Failed, TimedOut }
enum RunMode { LLM, Website }

function getRequiredDeposit(RunMode mode) view returns (uint256);
function requestAgentRun(string appAgentId, string task, string constraints, string[] urls) external payable returns (uint256 requestId);
function handleResponse(uint256 requestId, Response[] responses, ResponseStatus status, Request) external;  // only platform

event AgentRunRequested(uint256 indexed requestId, address indexed user, string appAgentId, uint256 indexed somniaAgentId, RunMode mode, string task, string url, uint256 deposit);
event AgentRunCompleted(uint256 indexed requestId, address indexed user, string appAgentId, RunStatus status, string result);
```

`getRequiredDeposit(mode) = platform.getRequestDeposit() + pricePerAgent(mode) * subcommitteeSize`. Excess `msg.value` is refunded to the caller.

---

## Agentic OS Kernel (`SomniacOSKernel.sol`)

### Owned

Minimal ownership primitive (`owner = msg.sender` at deploy time). All admin-mutating contracts inherit this. `transferOwnership(address)` requires non-zero next owner.

### ProtocolFeeVault

Collects a uniform per-action protocol fee (`0.1 STT` default). Every OS write action (`policy.create`, `process.create`, `process.step`, `workflow.run`) flows through `payFee`, which requires `msg.value == feeAmount` and emits `ProtocolFeePaid` indexed by `payer`, `processId`, `stepId`.

```solidity
address payable public feeRecipient;       // default 0x5905c9Dea6Ae52AA0947D8F7F218263889eDfC4E
uint256 public feeAmount = 0.1 ether;
uint256 public totalCollected;

function payFee(address payer, string actionType, uint256 processId, uint256 stepId) external payable;
function setFeeRecipient(address payable);  // onlyOwner
function setFeeAmount(uint256);             // onlyOwner
function withdraw(uint256 amount);          // onlyOwner; sends to feeRecipient

event ProtocolFeePaid(address indexed payer, string actionType, uint256 indexed processId, uint256 indexed stepId, uint256 amount);
event FeeRecipientUpdated(address indexed recipient);
event FeeAmountUpdated(uint256 amount);
event ProtocolFeesWithdrawn(address indexed recipient, uint256 amount);
```

**Invariants.** Funds are *held* in the vault until `withdraw` is called — `totalCollected` may exceed the current balance after withdrawals.

### CapabilityRegistry

Machine-readable directory of agent capabilities. Each capability has a mode (`0=LLM`, `1=Website`, `2=JSON`) corresponding to a `RunMode` and a fixed `somniaAgentId` for that mode. Only the owner may register / update / disable.

```solidity
struct Capability { bytes32 id; string label; string description; uint8 mode; bool active; uint256 somniaAgentId; string schemaURI; }
bytes32[] public capabilityIds;
mapping(bytes32 => Capability) public capabilities;

function registerCapability(bytes32 id, string label, string description, uint8 mode, uint256 somniaAgentId, string schemaURI);  // onlyOwner
function updateCapability(bytes32 id, string label, string description, uint8 mode, uint256 somniaAgentId, string schemaURI);    // onlyOwner
function setCapabilityStatus(bytes32 id, bool active);                                                                            // onlyOwner
function getCapabilityCount() view returns (uint256);
function isActive(bytes32 id) view returns (bool);
```

The deployment script seeds eight capabilities: `content.write`, `marketing.strategy`, `research.web`, `research.api`, `audit.code`, `treasury.plan`, `governance.draft`, `security.monitor`. Capability ids are `keccak256(name)`.

### AutonomyPolicyRegistry

User-approved bounds for autonomous execution. A `Policy` declares the maximum spend, step count, retry count, whether chained steps are allowed, the set of allowed capabilities, and a URI listing allowed domains. Each policy is owned by the address that approves it.

```solidity
struct Policy { address owner; uint256 maxSpend; uint256 maxSteps; uint256 maxRetries; bool allowChainedSteps; string allowedDomainsURI; bool active; }
mapping(uint256 => Policy) public policies;
mapping(uint256 => mapping(bytes32 => bool)) public allowedCapabilities;
ProtocolFeeVault public immutable feeVault;
address public workflowCreator;             // SomniacAgentRouterV2

function createPolicy(uint256 maxSpend, uint256 maxSteps, uint256 maxRetries, bool allowChainedSteps, bytes32[] capabilities, string allowedDomainsURI) external payable returns (uint256 policyId);          // 0.1 STT fee, msg.sender becomes owner
function createPolicyFor(address owner, uint256 maxSpend, uint256 maxSteps, uint256 maxRetries, bool allowChainedSteps, bytes32[] capabilities, string allowedDomainsURI) external returns (uint256 policyId);  // onlyWorkflowCreator, no fee (fee charged by router)
function updatePolicy(...);                  // policy owner only
function isCapabilityAllowed(uint256 policyId, bytes32 capabilityId) view returns (bool);
function setWorkflowCreator(address);        // onlyOwner

event PolicyCreated(uint256 indexed policyId, address indexed owner, uint256 maxSpend, uint256 maxSteps, uint256 maxRetries, bool allowChainedSteps, string allowedDomainsURI);
event PolicyUpdated(uint256 indexed policyId, uint256 maxSpend, uint256 maxSteps, uint256 maxRetries, bool allowChainedSteps, string allowedDomainsURI);
event WorkflowCreatorUpdated(address indexed workflowCreator);
```

**Why two creation paths.** Direct user-driven policy creation pays the fee inline. The one-transaction workflow shifts the fee to the router (via `payFee{value: fee}` directly), so `createPolicyFor` bypasses the inline fee to avoid double-charging.

### MemoryLedger

Append-only memory + handoff event log. Only callable by `processManager`; admin sets the manager once.

```solidity
function setProcessManager(address);          // onlyOwner
function writeMemory(uint256 processId, uint256 stepId, string kind, string contentURI, string summary, address writer);
function recordHandoff(uint256 processId, bytes32 fromCapability, bytes32 toCapability, string reasonURI);
function recordEvaluation(uint256 processId, uint256 score, string riskLevel, string evaluationURI);

event MemoryWritten(uint256 indexed processId, uint256 indexed stepId, string kind, string contentURI, string summary, address indexed writer);
event AgentHandoff(uint256 indexed processId, bytes32 indexed fromCapability, bytes32 indexed toCapability, string reasonURI);
event ProcessEvaluation(uint256 indexed processId, uint256 score, string riskLevel, string evaluationURI);
```

### ProcessManager

The OS scheduler and lifecycle source of truth. Holds the per-process state machine and the per-step state machine. Only the router may call `createProcessFor`, `registerStep`, and `completeStepFromRouter`.

```solidity
enum ProcessStatus { None, Created, Running, WaitingForCallback, Completed, Failed, Cancelled }
enum StepStatus    { None, Pending, Success, Failed, TimedOut }

struct Process { address owner; string goal; uint256 policyId; ProcessStatus status; uint256 spent; uint256 stepCount; uint256 createdAt; uint256 updatedAt; string resultURI; string finalSummary; }
struct Step    { uint256 processId; bytes32 capabilityId; string appAgentId; uint256 somniaAgentId; uint256 requestId; uint8 mode; StepStatus status; string prompt; string url; string result; uint256 createdAt; uint256 completedAt; }

mapping(uint256 => Process) public processes;
mapping(uint256 => mapping(uint256 => Step)) public steps;
mapping(uint256 => uint256) public requestToProcess;
mapping(uint256 => uint256) public requestToStep;

function createProcess(string goal, uint256 policyId, string metadataURI) external payable returns (uint256);  // 0.1 STT fee
function createProcessFor(address owner, string goal, uint256 policyId, string metadataURI) external returns (uint256);  // onlyRouter
function registerStep(address caller, uint256 processId, bytes32 capabilityId, string appAgentId, uint256 somniaAgentId, uint8 mode, uint256 requestId, string prompt, string url, uint256 totalCost) external returns (uint256 stepId);  // onlyRouter
function completeStepFromRouter(uint256 requestId, StepStatus status, string result) external;  // onlyRouter
function completeProcess(uint256 processId, string finalSummary, string resultURI);              // process owner
function cancelProcess(uint256 processId);                                                       // process owner
function setRouter(address);                                                                     // onlyOwner

event ProcessCreated(uint256 indexed processId, address indexed owner, uint256 indexed policyId, string goal, string metadataURI);
event ProcessStarted(uint256 indexed processId);
event ProcessStepRequested(uint256 indexed processId, uint256 indexed stepId, bytes32 indexed capabilityId, string appAgentId, uint256 somniaAgentId, uint8 mode, uint256 requestId, string prompt, string url, uint256 totalCost);
event ProcessStepCompleted(uint256 indexed processId, uint256 indexed stepId, uint256 indexed requestId, StepStatus status, string result);
event ProcessCompleted(uint256 indexed processId, string finalSummary, string resultURI);
event ProcessFailed(uint256 indexed processId, string reason);
event ProcessCancelled(uint256 indexed processId);
```

**State machine.**

```
ProcessStatus:
  None ──createProcess(For)──▶ Created
  Created ──registerStep──▶ WaitingForCallback
  WaitingForCallback ──completeStepFromRouter(Success)──▶ Running
  Running ──registerStep──▶ WaitingForCallback   (loop)
  WaitingForCallback ──completeStepFromRouter(Failed|TimedOut)──▶ Failed
  Running|WaitingForCallback ──completeProcess──▶ Completed
  any ──cancelProcess (except Completed|Cancelled)──▶ Cancelled

StepStatus:
  None ──registerStep──▶ Pending
  Pending ──completeStepFromRouter──▶ Success | Failed | TimedOut
```

`registerStep` enforces three policy guards in order: (1) capability active, (2) capability allowed by policy, (3) `stepCount < maxSteps && spent + totalCost <= maxSpend`. Each guard reverts the entire transaction on failure, including the upstream `platform.createRequest` call — meaning a policy violation refunds the user.

### SomniacAgentRouterV2

The OS-aware router for the Somnia Agents platform. Holds the per-`requestId` `RouterRun` row that links chain state back to the originating process/step. Implements `handleResponse` as the only mutation entry callable by the Somnia Agents platform.

```solidity
enum RunMode { LLM, Website, JSON }
enum RunStatus { None, Pending, Success, Failed, TimedOut }

function getRequiredDeposit(RunMode) view returns (uint256);            // platform deposit + price * subcommittee
function getTotalDue(RunMode) view returns (uint256);                    // getRequiredDeposit + protocolFee
function getRun(uint256 requestId) view returns (...);                   // full RouterRun shape

function launchWorkflowAgentRun(
    uint256 maxSpend, uint256 maxSteps, uint256 maxRetries, bool allowChainedSteps,
    bytes32[] allowedCapabilities, string allowedDomainsURI,
    string processGoal, string processMetadataURI,
    bytes32 capabilityId, string appAgentId, string task, string constraints, string[] urls, RunMode mode
) external payable returns (uint256 processId, uint256 requestId);

function requestProcessAgentRun(
    uint256 processId, bytes32 capabilityId, string appAgentId, string task, string constraints, string[] urls, RunMode mode
) external payable returns (uint256 requestId);

function handleResponse(uint256 requestId, Response[] responses, ResponseStatus status, Request) external;  // require msg.sender == platform

event OSAgentRunRequested(uint256 indexed processId, uint256 indexed stepId, uint256 indexed requestId, address user, bytes32 capabilityId, string appAgentId, uint256 somniaAgentId, RunMode mode, string task, string url, uint256 deposit, uint256 protocolFee);
event OSAgentRunCompleted(uint256 indexed processId, uint256 indexed stepId, uint256 indexed requestId, RunStatus status, string result);
```

**Constructor parameters** (used at deploy time):

- `platform_` — Somnia Agents platform address.
- `processManager_`, `policies_`, `feeVault_` — kernel dependencies.
- `llmAgentId_`, `websiteAgentId_`, `jsonAgentId_` — Somnia Agents platform ids.
- `subcommitteeSize_` — number of validators per request.
- `llmPricePerAgent_`, `websitePricePerAgent_`, `jsonPricePerAgent_` — per-validator cost per mode.

**Input limits.** `task` ≤ 2800 bytes, `constraints` ≤ 1600 bytes, `urls.length` ≤ 3.

**Payload construction.** `_payloadForMode` encodes the agent-specific calldata: `inferString(prompt, system, false, [])` for LLM, `ExtractString(...)` for Website, `fetchString(url, selector, 60)` for JSON. The system prompt always includes `"You are SomniacOS OS specialist <appAgentId>. Produce a direct final answer..."` so the Somnia Agents platform produces deterministic role-bound output.

**Refund.** Both entry points refund excess `msg.value - deposit - fee` to the caller via low-level `.call{value:}("")`.

---

## Test Coverage Highlights

`packages/contracts/test/SomniacOSKernel.t.sol` (155 lines, summary):

- `testProtocolFeeVaultCollectsFee` — verifies `payFee` reverts when `msg.value != feeAmount` and increments `totalCollected`.
- `testCapabilityRegistryRegistersAndDisables` — owner-only mutation paths.
- `testCreatePolicyChargesFee` — direct user `createPolicy` charges `0.1 STT` and writes the right policy row.
- `testProcessManagerEnforcesPolicy` — `registerStep` reverts when capability is inactive, blocked by policy, or exceeds `maxSteps` / `maxSpend`.
- `testRouterLaunchWorkflowEndToEnd` — one-transaction workflow: creates policy, process, pays fee, mocks platform request, returns refund.
- `testHandleResponseOnlyPlatform` — `handleResponse` reverts for any non-platform caller.

`packages/contracts/test/SomniacOS.t.sol` (23 lines) — smoke tests for core economy flow.

Run all tests:

```bash
pnpm --filter @somniacos/contracts test
# or directly
cd packages/contracts && forge test -vvv
```

---

## Security Notes

1. **Trusted callback origin** — `handleResponse` requires `msg.sender == address(platform)`. The platform address is `immutable`; rotation requires a new router deployment.
2. **Router authority** — `ProcessManager.{createProcessFor,registerStep,completeStepFromRouter}` are gated by `onlyRouter`. Rotating the router requires `setRouter` (onlyOwner) followed by re-pointing `AutonomyPolicyRegistry.workflowCreator` and `MemoryLedger.processManager`.
3. **Refunds use low-level call** — `payable(msg.sender).call{value: refundAmount}("")` is checked but does not protect against caller-side reentrancy. The router never reads its own balance after the call, and no further mutations follow the refund line.
4. **No upgradeability.** Contracts are non-upgradeable. Address rotation is the only deployment-evolution path. Update `apps/web/lib/contracts.ts` and `.env.example` together.
5. **Fee model.** Failed requests still pay the protocol fee, because the fee covers OS bookkeeping regardless of agent outcome. The Somnia Agents deposit is owned by the platform and follows its refund rules.
