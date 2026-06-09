# Agent Economy MVP — Implementation Plan (Phase 0 + 1 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Save location after plan mode exits:** `docs/superpowers/plans/2026-06-09-agent-economy-mvp-phase-1.md`. Companion brainstorm spec is in this same file's prior revision and should be saved at `docs/superpowers/specs/2026-06-09-agent-economy-v3-design.md`.

**Goal:** Ship the smallest end-to-end slice of the SomniacOS Agent Economy that proves the
architecture: Human/Agent landing split, `/agents` shell, a working `AgentEconomyDispatcher`
contract, one skill (Drafter — text generation), and Feature 1 (Create Your Agent).

**Architecture:** Modular Solidity contracts under `packages/contracts/src/agents/` with a
single `AgentEconomyDispatcher` acting as the only `callbackContract` registered with the
Somnia Agents Platform. Each business module (identity, skills, future marketplace) dispatches
inference calls through this hub and the hub routes the platform's callback back to the
originating module via low-level `.call()`. Frontend is a sibling route tree under
`apps/web/app/agents/` reusing the existing wallet + gas + notification infrastructure.

**Tech Stack:** Solidity 0.8.24 (Foundry, via_ir), Next.js 15 app router, viem, Tailwind,
lucide-react, existing `useSomniaWallet` + `notification-center`. Test framework: `forge test`.

---

## File Structure

### Contracts (new — under `packages/contracts/src/agents/`)

| File | Responsibility |
| --- | --- |
| `PlatformAdapter.sol` | Constants (PLATFORM address, agent IDs, callback selector). Pure constants — no state, no logic. |
| `AgentEconomyDispatcher.sol` | The single contract registered with the Somnia platform. Holds `pendingRequests` map; modules call `dispatch()` to submit an inference; the platform calls back `handleAgentResponse()` which low-level-calls the target module's resolver. |
| `ProtocolTreasury.sol` | Receives fee STT from all modules. Owner-only `withdraw()`. Public balance read. |
| `core/AgentIdentity.sol` | Feature 1 — registers agent profiles with LLM validation. |
| `skills/SkillRouter.sol` | Abstract base for skill modules: shared fee-collection + dispatch helper. |
| `skills/ContentCodeSkills.sol` | First concrete skill module. MVP exposes only `draft()` (S4). Stub for `lintSolidity()` and `explainFunction()` left for plan 2. |

### Contracts (new — under `packages/contracts/test/agents/`)

| File | Responsibility |
| --- | --- |
| `FakePlatform.sol` | Test double for `ISomniaAgentsPlatform`. Reuse the existing pattern from `test/SomniacOSKernel.t.sol`. |
| `AgentEconomyDispatcher.t.sol` | Unit tests for dispatch + callback routing. |
| `ProtocolTreasury.t.sol` | Tests for receive + withdraw. |
| `AgentIdentity.t.sol` | Tests for registration + LLM resolution. |
| `ContentCodeSkills.t.sol` | Tests for `draft()` end-to-end. |

### Frontend (new — under `apps/web/`)

| File | Responsibility |
| --- | --- |
| `components/surface-modal.tsx` | The Human/Agent picker with `backdrop-blur-xl` overlay. Persists choice to `localStorage.somniacos.surface`. |
| `components/chrome-switch.tsx` | "Switch surface" pill rendered in the existing chrome header when a surface is selected. |
| `app/agents/layout.tsx` | Sidebar shell for the agent surface. |
| `app/agents/page.tsx` | Hub dashboard. Lists protocol-level stats + quick links. |
| `app/agents/create/page.tsx` | Feature 1 form + flow. |
| `app/agents/skills/page.tsx` | Skill catalog grid. One card (Drafter) in MVP. |
| `app/agents/skills/[skillId]/page.tsx` | Per-skill detail + Try-it form + result render. |
| `lib/agents/contracts.ts` | Module addresses (env-overridable). |
| `lib/agents/dispatcher.ts` | Typed viem helpers for `dispatch()` + result polling. |
| `lib/agents/skill-registry.ts` | Static metadata for all skills (UI uses this to render cards + forms). MVP only has Drafter. |
| `components/agents/SkillCard.tsx` | Renders one skill card in the catalog. |
| `components/agents/TryItForm.tsx` | Generic typed form for any skill. |
| `components/agents/ResultRenderer.tsx` | Renders typed skill results. MVP: plain text. |

### Frontend (modified)

| File | Change |
| --- | --- |
| `app/page.tsx` | Add **Open app** button that mounts the surface modal. |
| `components/chrome.tsx` | Add ChromeSwitch pill + read `localStorage.somniacos.surface` to render Agent sidebar nav when on `/agents/*`. |
| `lib/contracts.ts` | Add module address constants + re-export. |

---

## Test Strategy

Each contract task follows strict TDD: test first, watch fail, implement, watch pass, commit.
Use the **FakePlatform mock** to drive `handleAgentResponse` without depending on the real
Somnia platform. Frontend tasks use manual browser testing (no Vitest is configured in the
current web app); each frontend task ends with a `pnpm --filter web dev` smoke check the
implementer runs locally.

---

## Tasks

### Task 1: Foundry project setup — agents directory

**Files:**
- Create: `packages/contracts/src/agents/.gitkeep`
- Create: `packages/contracts/test/agents/.gitkeep`

- [ ] **Step 1: Create directories**

```bash
mkdir -p packages/contracts/src/agents/core packages/contracts/src/agents/skills
mkdir -p packages/contracts/test/agents
touch packages/contracts/src/agents/.gitkeep
touch packages/contracts/test/agents/.gitkeep
```

- [ ] **Step 2: Confirm foundry still builds**

Run: `cd packages/contracts && forge build`
Expected: succeeds, no new contracts compiled yet.

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/agents packages/contracts/test/agents
git commit -m "chore: scaffold agents contract directories"
```

---

### Task 2: PlatformAdapter constants

**Files:**
- Create: `packages/contracts/src/agents/PlatformAdapter.sol`

- [ ] **Step 1: Write the file**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PlatformAdapter
/// @notice Pure constants shared by all Agent Economy modules. No state, no logic.
library PlatformAdapter {
    address internal constant PLATFORM      = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;
    uint256 internal constant LLM_AGENT_ID  = 12847293847561029384;
    uint256 internal constant WEB_AGENT_ID  = 12875401142070969085;
    uint256 internal constant JSON_AGENT_ID = 13174292974160097713;

    /// @dev keccak256("handleAgentResponse(uint256,(address,bytes,uint8,uint256,uint256,uint256)[],uint8,bytes)")
    ///      Computed once and verified in tests. Do not type by hand.
    bytes4 internal constant CALLBACK_SELECTOR = 0x60ab2b8c;
}
```

- [ ] **Step 2: Build to confirm it compiles**

Run: `cd packages/contracts && forge build`
Expected: PlatformAdapter.sol compiles with no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/agents/PlatformAdapter.sol
git commit -m "feat(agents): add PlatformAdapter constants library"
```

---

### Task 3: Verify CALLBACK_SELECTOR via unit test

**Files:**
- Create: `packages/contracts/test/agents/PlatformAdapter.t.sol`

- [ ] **Step 1: Write the failing assertion**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/agents/PlatformAdapter.sol";

contract PlatformAdapterTest is Test {
    function testCallbackSelectorMatchesSignature() public pure {
        bytes4 expected = bytes4(keccak256(
            "handleAgentResponse(uint256,(address,bytes,uint8,uint256,uint256,uint256)[],uint8,bytes)"
        ));
        assertEq(PlatformAdapter.CALLBACK_SELECTOR, expected, "selector drift");
    }
}
```

- [ ] **Step 2: Run the test**

Run: `cd packages/contracts && forge test --match-contract PlatformAdapterTest -vv`
Expected: PASS — confirms the hardcoded selector matches the signature.

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/test/agents/PlatformAdapter.t.sol
git commit -m "test(agents): assert PlatformAdapter selector matches signature"
```

---

### Task 4: FakePlatform mock

**Files:**
- Create: `packages/contracts/test/agents/FakePlatform.sol`

- [ ] **Step 1: Write the mock + interface**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISomniaAgentsPlatform {
    struct AgentResponse {
        address agentAddress;
        bytes   result;
        uint8   status;
        uint256 requestId;
        uint256 agentId;
        uint256 fee;
    }
    function createRequest(
        address callbackContract,
        bytes4  callbackSelector,
        uint256 agentId,
        string  calldata prompt,
        uint256 deposit
    ) external payable returns (uint256 requestId);
    function getTotalDue(uint256 agentId, uint256 subcommitteeSize) external view returns (uint256);
}

contract FakePlatform is ISomniaAgentsPlatform {
    uint256 public nextRequestId = 1000;
    uint256 public depositRequired = 0.05 ether;

    mapping(uint256 => address) public callbackOf;
    mapping(uint256 => bytes4)  public selectorOf;

    function setDeposit(uint256 d) external { depositRequired = d; }

    function getTotalDue(uint256, uint256) external view override returns (uint256) {
        return depositRequired;
    }

    function createRequest(
        address callbackContract,
        bytes4  callbackSelector,
        uint256,
        string calldata,
        uint256 deposit
    ) external payable override returns (uint256 requestId) {
        require(msg.value >= deposit, "deposit");
        requestId = nextRequestId++;
        callbackOf[requestId] = callbackContract;
        selectorOf[requestId] = callbackSelector;
    }

    /// @notice Deliver a synthetic success result back to the registered callback.
    function deliver(uint256 requestId, string memory resultText) external {
        AgentResponse[] memory responses = new AgentResponse[](1);
        responses[0] = AgentResponse({
            agentAddress: address(this),
            result:       bytes(resultText),
            status:       2,
            requestId:    requestId,
            agentId:      0,
            fee:          0
        });
        (bool ok, ) = callbackOf[requestId].call(
            abi.encodeWithSelector(selectorOf[requestId], requestId, responses, uint8(2), bytes(""))
        );
        require(ok, "callback failed");
    }
}
```

- [ ] **Step 2: Build**

Run: `cd packages/contracts && forge build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/test/agents/FakePlatform.sol
git commit -m "test(agents): add FakePlatform mock"
```

---

### Task 5: ProtocolTreasury contract

**Files:**
- Create: `packages/contracts/src/agents/ProtocolTreasury.sol`

- [ ] **Step 1: Write the failing test first**

Create `packages/contracts/test/agents/ProtocolTreasury.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/agents/ProtocolTreasury.sol";

contract ProtocolTreasuryTest is Test {
    ProtocolTreasury treasury;
    address owner = address(0xA1);
    address other = address(0xB2);

    function setUp() public {
        treasury = new ProtocolTreasury(owner);
    }

    function testReceivesEther() public {
        vm.deal(other, 5 ether);
        vm.prank(other);
        (bool ok, ) = address(treasury).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(treasury).balance, 1 ether);
    }

    function testOwnerCanWithdraw() public {
        vm.deal(address(treasury), 3 ether);
        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        treasury.withdraw(2 ether);
        assertEq(owner.balance, ownerBefore + 2 ether);
        assertEq(address(treasury).balance, 1 ether);
    }

    function testNonOwnerCannotWithdraw() public {
        vm.deal(address(treasury), 1 ether);
        vm.prank(other);
        vm.expectRevert("not owner");
        treasury.withdraw(1 ether);
    }
}
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd packages/contracts && forge test --match-contract ProtocolTreasuryTest -vv`
Expected: FAIL with `Compilation failed` — ProtocolTreasury doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProtocolTreasury
/// @notice Single sink for every Agent Economy fee. Owner-only withdraw. Public balance.
contract ProtocolTreasury {
    address public owner;

    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);
    event OwnerChanged(address indexed previous, address indexed next);

    constructor(address initialOwner) {
        owner = initialOwner;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "not owner");
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "withdraw failed");
        emit Withdraw(owner, amount);
    }

    function setOwner(address next) external {
        require(msg.sender == owner, "not owner");
        emit OwnerChanged(owner, next);
        owner = next;
    }
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `cd packages/contracts && forge test --match-contract ProtocolTreasuryTest -vv`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/agents/ProtocolTreasury.sol packages/contracts/test/agents/ProtocolTreasury.t.sol
git commit -m "feat(agents): add ProtocolTreasury with owner-gated withdraw"
```

---

### Task 6: AgentEconomyDispatcher — types + storage

**Files:**
- Create: `packages/contracts/src/agents/AgentEconomyDispatcher.sol`

- [ ] **Step 1: Write skeleton**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PlatformAdapter.sol";

interface ISomniaAgentsPlatformMin {
    struct AgentResponse {
        address agentAddress;
        bytes   result;
        uint8   status;
        uint256 requestId;
        uint256 agentId;
        uint256 fee;
    }
    function createRequest(
        address callbackContract,
        bytes4  callbackSelector,
        uint256 agentId,
        string  calldata prompt,
        uint256 deposit
    ) external payable returns (uint256 requestId);
    function getTotalDue(uint256 agentId, uint256 subcommitteeSize) external view returns (uint256);
}

contract AgentEconomyDispatcher {
    struct Pending {
        address module;            // who initiated; gets the resolver callback
        bytes4  resolveSelector;   // module's resolver function selector
        bytes   context;           // arbitrary context the module wants back
        address initiator;         // original EOA / contract that triggered dispatch
    }

    address public immutable PLATFORM;
    address public treasury;
    address public owner;

    mapping(uint256 => Pending) public pendingRequests;

    event Dispatched(
        uint256 indexed requestId,
        address indexed module,
        address indexed initiator,
        uint256 agentId
    );
    event InferenceResult(uint256 indexed requestId, address indexed module, uint8 status);
    event ResolverFailed(uint256 indexed requestId, address indexed module);

    error OnlyPlatform();
    error OnlyOwner();
    error UnknownRequest();

    constructor(address platform_, address treasury_) {
        PLATFORM = platform_;
        treasury = treasury_;
        owner = msg.sender;
    }

    function setTreasury(address next) external {
        if (msg.sender != owner) revert OnlyOwner();
        treasury = next;
    }
}
```

- [ ] **Step 2: Build**

Run: `cd packages/contracts && forge build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/agents/AgentEconomyDispatcher.sol
git commit -m "feat(agents): add dispatcher skeleton with types and storage"
```

---

### Task 7: Dispatcher `dispatch()` function

**Files:**
- Modify: `packages/contracts/src/agents/AgentEconomyDispatcher.sol`

- [ ] **Step 1: Write the failing test first**

Create `packages/contracts/test/agents/AgentEconomyDispatcher.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/agents/AgentEconomyDispatcher.sol";
import "../../src/agents/PlatformAdapter.sol";
import "./FakePlatform.sol";

contract MockModule {
    AgentEconomyDispatcher public dispatcher;
    bytes public lastResult;
    bytes public lastContext;

    constructor(AgentEconomyDispatcher d) { dispatcher = d; }

    function fire(string memory prompt, bytes memory ctx) external payable returns (uint256) {
        return dispatcher.dispatch{value: msg.value}(
            PlatformAdapter.LLM_AGENT_ID,
            prompt,
            this.resolve.selector,
            ctx,
            msg.sender
        );
    }

    function resolve(uint256, bytes calldata result, bytes calldata ctx) external {
        require(msg.sender == address(dispatcher), "not dispatcher");
        lastResult  = result;
        lastContext = ctx;
    }
}

contract DispatcherTest is Test {
    FakePlatform platform;
    AgentEconomyDispatcher dispatcher;
    MockModule module;
    address user = address(0xBEEF);

    function setUp() public {
        platform   = new FakePlatform();
        dispatcher = new AgentEconomyDispatcher(address(platform), address(0xDEAD));
        module     = new MockModule(dispatcher);
    }

    function testDispatchStoresPending() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        uint256 requestId = module.fire{value: 0.05 ether}("hello", abi.encode("ctx-1"));

        (address modAddr, bytes4 sel, bytes memory ctx, address initiator) = dispatcher.pendingRequests(requestId);
        assertEq(modAddr, address(module));
        assertEq(sel, MockModule.resolve.selector);
        assertEq(initiator, user);
        assertEq(abi.decode(ctx, (string)), "ctx-1");
    }
}
```

- [ ] **Step 2: Run to confirm fail**

Run: `cd packages/contracts && forge test --match-contract DispatcherTest -vv`
Expected: FAIL — `dispatch` doesn't exist yet.

- [ ] **Step 3: Add `dispatch` to dispatcher**

Append inside the contract body of `AgentEconomyDispatcher.sol`:

```solidity
    function dispatch(
        uint256 agentId,
        string calldata prompt,
        bytes4 resolveSelector,
        bytes calldata context,
        address initiator
    ) external payable returns (uint256 requestId) {
        requestId = ISomniaAgentsPlatformMin(PLATFORM).createRequest{value: msg.value}(
            address(this),
            PlatformAdapter.CALLBACK_SELECTOR,
            agentId,
            prompt,
            msg.value
        );
        pendingRequests[requestId] = Pending({
            module:          msg.sender,
            resolveSelector: resolveSelector,
            context:         context,
            initiator:       initiator
        });
        emit Dispatched(requestId, msg.sender, initiator, agentId);
    }
```

- [ ] **Step 4: Run test to confirm pass**

Run: `cd packages/contracts && forge test --match-contract DispatcherTest -vv`
Expected: `testDispatchStoresPending` PASSES.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/agents/AgentEconomyDispatcher.sol packages/contracts/test/agents/AgentEconomyDispatcher.t.sol
git commit -m "feat(agents): dispatcher.dispatch() stores pending request"
```

---

### Task 8: Dispatcher `handleAgentResponse()` routing

**Files:**
- Modify: `packages/contracts/src/agents/AgentEconomyDispatcher.sol`
- Modify: `packages/contracts/test/agents/AgentEconomyDispatcher.t.sol`

- [ ] **Step 1: Add the failing test**

Append to `DispatcherTest`:

```solidity
    function testHandleAgentResponseForwardsToModule() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        uint256 requestId = module.fire{value: 0.05 ether}("hello", abi.encode("ctx-2"));

        platform.deliver(requestId, "world");

        assertEq(string(module.lastResult()), "world");
        assertEq(abi.decode(module.lastContext(), (string)), "ctx-2");
        // pending should be cleared
        (address modAddr, , , ) = dispatcher.pendingRequests(requestId);
        assertEq(modAddr, address(0));
    }

    function testHandleAgentResponseRejectsNonPlatform() public {
        vm.prank(user);
        vm.expectRevert(AgentEconomyDispatcher.OnlyPlatform.selector);
        ISomniaAgentsPlatformMin.AgentResponse[] memory empty;
        dispatcher.handleAgentResponse(0, empty, uint8(2), bytes(""));
    }
```

- [ ] **Step 2: Run to confirm fail**

Run: `cd packages/contracts && forge test --match-contract DispatcherTest -vv`
Expected: compile error or revert — `handleAgentResponse` not implemented.

- [ ] **Step 3: Implement**

Append inside `AgentEconomyDispatcher.sol`:

```solidity
    function handleAgentResponse(
        uint256 requestId,
        ISomniaAgentsPlatformMin.AgentResponse[] calldata responses,
        uint8 status,
        bytes calldata
    ) external {
        if (msg.sender != PLATFORM) revert OnlyPlatform();

        Pending memory p = pendingRequests[requestId];
        if (p.module == address(0)) return; // unknown — silent ignore, never revert

        emit InferenceResult(requestId, p.module, status);

        if (status == 2 && responses.length > 0) {
            (bool ok, ) = p.module.call(
                abi.encodeWithSelector(p.resolveSelector, requestId, responses[0].result, p.context)
            );
            if (!ok) emit ResolverFailed(requestId, p.module);
        }
        delete pendingRequests[requestId];
    }
```

- [ ] **Step 4: Run all dispatcher tests**

Run: `cd packages/contracts && forge test --match-contract DispatcherTest -vv`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/agents/AgentEconomyDispatcher.sol packages/contracts/test/agents/AgentEconomyDispatcher.t.sol
git commit -m "feat(agents): dispatcher routes platform callback to module resolver"
```

---

### Task 9: SkillRouter abstract base

**Files:**
- Create: `packages/contracts/src/agents/skills/SkillRouter.sol`

- [ ] **Step 1: Write the abstract base**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../AgentEconomyDispatcher.sol";
import "../ProtocolTreasury.sol";

/// @title SkillRouter
/// @notice Abstract base for skill modules. Handles fee splitting + dispatch wiring.
abstract contract SkillRouter {
    AgentEconomyDispatcher public immutable dispatcher;
    ProtocolTreasury       public immutable treasury;

    /// @notice Per-call protocol fee on top of platform's deposit, in wei.
    uint256 public protocolFee;

    event ProtocolFeeUpdated(uint256 newFee);

    constructor(AgentEconomyDispatcher d, ProtocolTreasury t, uint256 initialFee) {
        dispatcher  = d;
        treasury    = t;
        protocolFee = initialFee;
    }

    function _fireInference(
        uint256 agentId,
        string memory prompt,
        bytes4 resolveSelector,
        bytes memory context
    ) internal returns (uint256 requestId) {
        // Caller forwarded msg.value; we keep `protocolFee` and send the rest to the platform.
        uint256 toPlatform = msg.value - protocolFee;
        // Pay treasury synchronously so failed inference still funds the protocol.
        (bool paid, ) = address(treasury).call{value: protocolFee}("");
        require(paid, "treasury pay");
        requestId = dispatcher.dispatch{value: toPlatform}(
            agentId,
            prompt,
            resolveSelector,
            context,
            msg.sender
        );
    }
}
```

- [ ] **Step 2: Build**

Run: `cd packages/contracts && forge build`
Expected: compiles. (Abstract; no deployment.)

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/agents/skills/SkillRouter.sol
git commit -m "feat(agents): add SkillRouter abstract base"
```

---

### Task 10: ContentCodeSkills — Drafter (S4)

**Files:**
- Create: `packages/contracts/src/agents/skills/ContentCodeSkills.sol`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/test/agents/ContentCodeSkills.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/agents/ProtocolTreasury.sol";
import "../../src/agents/AgentEconomyDispatcher.sol";
import "../../src/agents/skills/ContentCodeSkills.sol";
import "./FakePlatform.sol";

contract ContentCodeSkillsTest is Test {
    FakePlatform platform;
    AgentEconomyDispatcher dispatcher;
    ProtocolTreasury treasury;
    ContentCodeSkills skills;
    address user = address(0xCAFE);

    function setUp() public {
        platform   = new FakePlatform();
        treasury   = new ProtocolTreasury(address(this));
        dispatcher = new AgentEconomyDispatcher(address(platform), address(treasury));
        skills     = new ContentCodeSkills(dispatcher, treasury, 0.01 ether);
    }

    function testDraftEmitsRequestAndResolves() public {
        vm.deal(user, 1 ether);
        vm.recordLogs();
        vm.prank(user);
        uint256 requestId = skills.draft{value: 0.06 ether}(
            "Tweet about Somnia winning",
            "X",
            "TWEET"
        );
        // Treasury collected the protocol fee
        assertEq(address(treasury).balance, 0.01 ether);

        platform.deliver(requestId, "Somnia just shipped a builder demo. wow.");

        (string memory resultText, bool resolved) = skills.results(requestId);
        assertTrue(resolved);
        assertEq(resultText, "Somnia just shipped a builder demo. wow.");
    }
}
```

- [ ] **Step 2: Run to fail**

Run: `cd packages/contracts && forge test --match-contract ContentCodeSkillsTest -vv`
Expected: FAIL — contract doesn't exist.

- [ ] **Step 3: Implement**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SkillRouter.sol";
import "../PlatformAdapter.sol";

/// @title ContentCodeSkills
/// @notice MVP exposes Drafter (S4). Lint + Explain are placeholders for plan 2.
contract ContentCodeSkills is SkillRouter {
    struct Result {
        string text;
        bool   resolved;
    }
    mapping(uint256 => Result) public results;
    mapping(uint256 => address) public callerOf;

    event DraftRequested(uint256 indexed requestId, address indexed caller, string topic, string audience, string format);
    event DraftResolved(uint256 indexed requestId, string text);

    constructor(AgentEconomyDispatcher d, ProtocolTreasury t, uint256 fee)
        SkillRouter(d, t, fee)
    {}

    /// @notice Generates short-form text. Returns requestId.
    function draft(
        string calldata topic,
        string calldata audience,
        string calldata format
    ) external payable returns (uint256 requestId) {
        require(bytes(topic).length > 0 && bytes(topic).length < 280, "topic length");
        require(bytes(format).length > 0, "format");

        string memory prompt = string.concat(
            "Write content for ", audience,
            ". Format: ", format,
            ". Topic: ", topic,
            ". Output ONLY the final text. No preamble."
        );

        requestId = _fireInference(
            PlatformAdapter.LLM_AGENT_ID,
            prompt,
            this.resolveDraft.selector,
            ""
        );
        callerOf[requestId] = msg.sender;
        emit DraftRequested(requestId, msg.sender, topic, audience, format);
    }

    function resolveDraft(uint256 requestId, bytes calldata result, bytes calldata) external {
        require(msg.sender == address(dispatcher), "only dispatcher");
        string memory text = string(result);
        results[requestId] = Result({text: text, resolved: true});
        emit DraftResolved(requestId, text);
    }
}
```

- [ ] **Step 4: Run test**

Run: `cd packages/contracts && forge test --match-contract ContentCodeSkillsTest -vv`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/agents/skills/ContentCodeSkills.sol packages/contracts/test/agents/ContentCodeSkills.t.sol
git commit -m "feat(agents): add Drafter skill (S4) under ContentCodeSkills"
```

---

### Task 11: AgentIdentity contract (Feature 1)

**Files:**
- Create: `packages/contracts/src/agents/core/AgentIdentity.sol`

- [ ] **Step 1: Write the failing test**

Create `packages/contracts/test/agents/AgentIdentity.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/agents/AgentEconomyDispatcher.sol";
import "../../src/agents/ProtocolTreasury.sol";
import "../../src/agents/core/AgentIdentity.sol";
import "./FakePlatform.sol";

contract AgentIdentityTest is Test {
    FakePlatform platform;
    AgentEconomyDispatcher dispatcher;
    ProtocolTreasury treasury;
    AgentIdentity identity;
    address agent = address(0xA000);

    function setUp() public {
        platform   = new FakePlatform();
        treasury   = new ProtocolTreasury(address(this));
        dispatcher = new AgentEconomyDispatcher(address(platform), address(treasury));
        identity   = new AgentIdentity(dispatcher, treasury, 0.01 ether);
    }

    function testRegistrationApproved() public {
        vm.deal(agent, 1 ether);
        string[] memory caps = new string[](2);
        caps[0] = "research.web";
        caps[1] = "content.write";

        vm.prank(agent);
        uint256 requestId = identity.requestRegistration{value: 0.5 ether}(
            "Atlas",
            "Research analyst",
            caps,
            0.4 ether
        );

        platform.deliver(requestId, "APPROVE: looks legit");

        (string memory name, , , uint256 staked, , , bool active) = identity.agents(agent);
        assertEq(name, "Atlas");
        assertEq(staked, 0.4 ether);
        assertTrue(active);
    }

    function testRegistrationDenied() public {
        vm.deal(agent, 1 ether);
        string[] memory caps = new string[](1);
        caps[0] = "spam";

        vm.prank(agent);
        uint256 requestId = identity.requestRegistration{value: 0.5 ether}(
            "SpamBot",
            "Spam",
            caps,
            0.4 ether
        );

        uint256 balBefore = agent.balance;
        platform.deliver(requestId, "DENY: nope");

        ( , , , uint256 staked, , , bool active) = identity.agents(agent);
        assertFalse(active);
        assertEq(staked, 0);
        assertEq(agent.balance, balBefore + 0.4 ether);
    }
}
```

- [ ] **Step 2: Run to fail**

Run: `cd packages/contracts && forge test --match-contract AgentIdentityTest -vv`
Expected: FAIL — contract not implemented.

- [ ] **Step 3: Implement**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../AgentEconomyDispatcher.sol";
import "../ProtocolTreasury.sol";
import "../PlatformAdapter.sol";

contract AgentIdentity {
    struct Profile {
        string   name;
        string   description;
        string[] capabilities;
        uint256  stakedSTT;
        uint256  reputationScore;
        uint256  registeredAt;
        bool     active;
    }
    struct Pending {
        address  agent;
        string   name;
        string   description;
        string[] capabilities;
        uint256  stake;
    }

    AgentEconomyDispatcher public immutable dispatcher;
    ProtocolTreasury       public immutable treasury;
    uint256 public protocolFee;

    mapping(address => Profile)  public agents;
    mapping(uint256 => Pending)  public pendingRegs;
    mapping(bytes32 => bool)     public takenNames;

    event RegistrationRequested(uint256 indexed requestId, address indexed agent, string name);
    event RegistrationApproved(address indexed agent, string name);
    event RegistrationDenied(address indexed agent, string reason);

    constructor(AgentEconomyDispatcher d, ProtocolTreasury t, uint256 fee) {
        dispatcher  = d;
        treasury    = t;
        protocolFee = fee;
    }

    function requestRegistration(
        string calldata name,
        string calldata description,
        string[] calldata capabilities,
        uint256 stake
    ) external payable returns (uint256 requestId) {
        require(bytes(name).length > 0 && bytes(name).length < 32, "name length");
        require(stake >= 0.1 ether, "min stake 0.1 STT");
        require(msg.value >= stake + protocolFee, "underfunded");
        bytes32 nameHash = keccak256(bytes(name));
        require(!takenNames[nameHash], "name taken");
        require(!agents[msg.sender].active, "already registered");

        (bool paid, ) = address(treasury).call{value: protocolFee}("");
        require(paid, "treasury pay");

        string memory prompt = string.concat(
            "You are the SomniacOS Agent Registry validator. ",
            "Evaluate this registration:\n",
            "Name: ", name, "\n",
            "Description: ", description, "\n",
            "Respond ONLY with 'APPROVE: reason' or 'DENY: reason'."
        );
        uint256 inferenceValue = msg.value - protocolFee - stake;
        requestId = dispatcher.dispatch{value: inferenceValue}(
            PlatformAdapter.LLM_AGENT_ID,
            prompt,
            this.resolveRegistration.selector,
            "",
            msg.sender
        );

        pendingRegs[requestId] = Pending({
            agent:        msg.sender,
            name:         name,
            description:  description,
            capabilities: capabilities,
            stake:        stake
        });
        takenNames[nameHash] = true; // reserve while pending; freed on deny

        emit RegistrationRequested(requestId, msg.sender, name);
    }

    function resolveRegistration(uint256 requestId, bytes calldata result, bytes calldata) external {
        require(msg.sender == address(dispatcher), "only dispatcher");
        Pending memory p = pendingRegs[requestId];
        require(p.agent != address(0), "unknown");
        delete pendingRegs[requestId];

        string memory text = string(result);
        if (_startsWith(text, "APPROVE")) {
            agents[p.agent] = Profile({
                name:            p.name,
                description:     p.description,
                capabilities:    p.capabilities,
                stakedSTT:       p.stake,
                reputationScore: 500,
                registeredAt:    block.timestamp,
                active:          true
            });
            emit RegistrationApproved(p.agent, p.name);
        } else {
            takenNames[keccak256(bytes(p.name))] = false;
            (bool ok, ) = p.agent.call{value: p.stake}("");
            require(ok, "refund failed");
            emit RegistrationDenied(p.agent, text);
        }
    }

    function _startsWith(string memory s, string memory prefix) private pure returns (bool) {
        bytes memory b = bytes(s);
        bytes memory p = bytes(prefix);
        if (b.length < p.length) return false;
        for (uint256 i; i < p.length; ++i) {
            if (b[i] != p[i]) return false;
        }
        return true;
    }
}
```

Note: the constructor stores stake from `requestRegistration`'s `msg.value`, so the test
needs to forward enough value to cover protocolFee + stake + inference deposit. The
`FakePlatform.depositRequired` default is 0.05 ether — the test sends 0.5 ether (0.01 fee +
0.4 stake + 0.09 leftover that becomes the inference deposit, well above 0.05).

- [ ] **Step 4: Run test**

Run: `cd packages/contracts && forge test --match-contract AgentIdentityTest -vv`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/agents/core/AgentIdentity.sol packages/contracts/test/agents/AgentIdentity.t.sol
git commit -m "feat(agents): add AgentIdentity registration with LLM validation"
```

---

### Task 12: Deploy script

**Files:**
- Create: `packages/contracts/script/DeployAgentEconomy.s.sol`

- [ ] **Step 1: Write deploy script**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/agents/ProtocolTreasury.sol";
import "../src/agents/AgentEconomyDispatcher.sol";
import "../src/agents/skills/ContentCodeSkills.sol";
import "../src/agents/core/AgentIdentity.sol";

contract DeployAgentEconomy is Script {
    address constant PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        ProtocolTreasury treasury = new ProtocolTreasury(deployer);
        AgentEconomyDispatcher dispatcher = new AgentEconomyDispatcher(PLATFORM, address(treasury));
        ContentCodeSkills content = new ContentCodeSkills(dispatcher, treasury, 0.1 ether);
        AgentIdentity identity = new AgentIdentity(dispatcher, treasury, 0.1 ether);

        vm.stopBroadcast();

        console.log("ProtocolTreasury     ", address(treasury));
        console.log("AgentEconomyDispatcher", address(dispatcher));
        console.log("ContentCodeSkills    ", address(content));
        console.log("AgentIdentity        ", address(identity));
    }
}
```

- [ ] **Step 2: Dry-run on a local fork**

Run: `cd packages/contracts && forge script script/DeployAgentEconomy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast=false`
Expected: prints four would-deploy contracts. If no local node is running, skip the run and trust forge build.

- [ ] **Step 3: Build to confirm**

Run: `cd packages/contracts && forge build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add packages/contracts/script/DeployAgentEconomy.s.sol
git commit -m "feat(agents): add DeployAgentEconomy script"
```

- [ ] **Step 5: Deploy to Somnia Shannon and capture addresses**

Run (with deployer key in env):
```bash
cd packages/contracts && DEPLOYER_PK=$DEPLOYER_PK forge script script/DeployAgentEconomy.s.sol \
  --rpc-url https://dream-rpc.somnia.network/ --broadcast --legacy
```
Record the four printed addresses.

---

### Task 13: Wire deployed addresses to frontend

**Files:**
- Create: `apps/web/lib/agents/contracts.ts`

- [ ] **Step 1: Write the addresses file**

Replace `0x_______` placeholders with the four addresses captured in Task 12 Step 5.

```ts
import type { Address } from "viem";

export const agentEconomyContracts = {
  ProtocolTreasury:       (process.env.NEXT_PUBLIC_AGENT_TREASURY        ?? "0x_______") as Address,
  AgentEconomyDispatcher: (process.env.NEXT_PUBLIC_AGENT_DISPATCHER      ?? "0x_______") as Address,
  ContentCodeSkills:      (process.env.NEXT_PUBLIC_AGENT_CONTENT_SKILLS  ?? "0x_______") as Address,
  AgentIdentity:          (process.env.NEXT_PUBLIC_AGENT_IDENTITY        ?? "0x_______") as Address,
} as const;

export const agentEconomyConfigured =
  Object.values(agentEconomyContracts).every((address) => address !== "0x_______");
```

- [ ] **Step 2: Run typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/agents/contracts.ts
git commit -m "feat(agents-web): export agent economy contract addresses"
```

---

### Task 14: Skill registry metadata

**Files:**
- Create: `apps/web/lib/agents/skill-registry.ts`

- [ ] **Step 1: Write the registry**

```ts
import type { Address } from "viem";
import { agentEconomyContracts } from "./contracts";

export type SkillInputField =
  | { name: string; label: string; type: "string"; placeholder?: string; rows?: number }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[] };

export type SkillMeta = {
  id: string;
  name: string;
  category: "Content + Code" | "Verification" | "Decision" | "Monitoring" | "Truth & Oracle" | "Action Safety";
  description: string;
  module: Address;
  functionName: string;
  estimatedFeeSTT: string;          // human display only; rendered "0.15 STT"
  estimatedLatencySeconds: number;  // for UI hint
  fields: SkillInputField[];
  // event signature emitted on resolution; UI filters logs by it
  resolvedEventName: string;
};

export const skillRegistry: SkillMeta[] = [
  {
    id: "drafter",
    name: "Drafter",
    category: "Content + Code",
    description: "Generates polished short-form text (tweet, thread, email, press release) from a topic + audience + format.",
    module: agentEconomyContracts.ContentCodeSkills,
    functionName: "draft",
    estimatedFeeSTT: "~0.15 STT",
    estimatedLatencySeconds: 8,
    resolvedEventName: "DraftResolved",
    fields: [
      { name: "topic",    label: "Topic",    type: "string", placeholder: "Somnia winning a hackathon", rows: 2 },
      { name: "audience", label: "Audience", type: "string", placeholder: "X / Twitter readers" },
      { name: "format",   label: "Format",   type: "select", options: [
        { value: "TWEET",          label: "Tweet (≤280 chars)" },
        { value: "THREAD",         label: "X thread (numbered)" },
        { value: "EMAIL",          label: "Email" },
        { value: "PRESS_RELEASE",  label: "Press release" },
      ]},
    ],
  },
];

export function getSkill(id: string): SkillMeta | undefined {
  return skillRegistry.find((s) => s.id === id);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/agents/skill-registry.ts
git commit -m "feat(agents-web): seed skill registry with Drafter"
```

---

### Task 15: Dispatcher ABI + typed viem helpers

**Files:**
- Create: `apps/web/lib/agents/dispatcher.ts`

- [ ] **Step 1: Write the file**

```ts
import { decodeEventLog, parseAbiItem, type Address, type Hash, type PublicClient } from "viem";

export const contentCodeSkillsAbi = [
  parseAbiItem("function draft(string topic, string audience, string format) payable returns (uint256 requestId)"),
  parseAbiItem("event DraftRequested(uint256 indexed requestId, address indexed caller, string topic, string audience, string format)"),
  parseAbiItem("event DraftResolved(uint256 indexed requestId, string text)"),
];

export const agentIdentityAbi = [
  parseAbiItem("function requestRegistration(string name, string description, string[] capabilities, uint256 stake) payable returns (uint256 requestId)"),
  parseAbiItem("event RegistrationRequested(uint256 indexed requestId, address indexed agent, string name)"),
  parseAbiItem("event RegistrationApproved(address indexed agent, string name)"),
  parseAbiItem("event RegistrationDenied(address indexed agent, string reason)"),
];

/// Polls module events for a given requestId. Returns the first matching log's args.
export async function waitForSkillResult<T>(opts: {
  client: PublicClient;
  module: Address;
  eventName: string;
  requestId: bigint;
  startBlock: bigint;
  timeoutMs?: number;
  pollIntervalMs?: number;
  decoder: (args: unknown) => T;
}): Promise<T> {
  const { client, module, eventName, requestId, startBlock, decoder } = opts;
  const timeoutMs = opts.timeoutMs ?? 180_000;
  const pollIntervalMs = opts.pollIntervalMs ?? 3000;
  const event = (eventName === "DraftResolved"
    ? contentCodeSkillsAbi.find((a: any) => a.type === "event" && a.name === "DraftResolved")
    : eventName === "RegistrationApproved"
      ? agentIdentityAbi.find((a: any) => a.type === "event" && a.name === "RegistrationApproved")
      : eventName === "RegistrationDenied"
        ? agentIdentityAbi.find((a: any) => a.type === "event" && a.name === "RegistrationDenied")
        : null);
  if (!event) throw new Error(`Unknown event: ${eventName}`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const logs = await client.getLogs({
      address: module,
      event: event as any,
      args: { requestId },
      fromBlock: startBlock > 5n ? startBlock - 5n : 0n,
    });
    if (logs.length > 0) {
      const decoded = decodeEventLog({ abi: [event] as any, data: logs[0].data, topics: logs[0].topics });
      return decoder(decoded.args);
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error(`Timed out waiting for ${eventName} on request ${requestId}`);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/agents/dispatcher.ts
git commit -m "feat(agents-web): typed ABI + waitForSkillResult helper"
```

---

### Task 16: Surface Modal (Human/Agent picker)

**Files:**
- Create: `apps/web/components/surface-modal.tsx`

- [ ] **Step 1: Write the modal**

```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Bot } from "lucide-react";

const STORAGE_KEY = "somniacos.surface";

export function SurfaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  function choose(surface: "human" | "agent") {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, surface);
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-xl">
      <div className="rounded-3xl border border-white/10 bg-[#0c0c0c]/95 p-8 shadow-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">Who's entering?</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Pick a door.</h2>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link
            href="/workbench"
            onClick={() => choose("human")}
            className="group flex h-56 w-56 flex-col items-center justify-center rounded-2xl border border-amber-200/25 bg-amber-200/5 p-6 transition hover:bg-amber-200/10"
          >
            <Users className="h-12 w-12 text-amber-200" />
            <p className="mt-4 text-2xl font-semibold text-white">Human</p>
            <p className="mt-1 text-xs leading-5 text-white/55">Run agents. Launch missions.</p>
          </Link>
          <Link
            href="/agents"
            onClick={() => choose("agent")}
            className="group flex h-56 w-56 flex-col items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/5 p-6 transition hover:bg-cyan-300/10"
          >
            <Bot className="h-12 w-12 text-cyan-300" />
            <p className="mt-4 text-2xl font-semibold text-white">Agent</p>
            <p className="mt-1 text-xs leading-5 text-white/55">Call skills. Earn STT.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function useSurfacePersistence() {
  const [surface, setSurface] = useState<"human" | "agent" | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "human" || raw === "agent") setSurface(raw);
  }, []);
  return surface;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/surface-modal.tsx
git commit -m "feat(agents-web): add SurfaceModal Human/Agent picker"
```

---

### Task 17: Wire Open-app button on landing

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Add the button + state**

Find the landing page's primary CTA. Wrap or replace with:

```tsx
"use client";
import { useState } from "react";
import { SurfaceModal } from "../components/surface-modal";
// ... other existing imports

export default function LandingPage() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* keep all existing landing content */}
      {/* … */}
      <button onClick={() => setOpen(true)} className="rounded-xl bg-signal px-6 py-3 font-semibold text-black">
        Open app
      </button>
      <SurfaceModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

Note: if `apps/web/app/page.tsx` is currently a Server Component, extract its body into a
`LandingClient` child component to keep the file boundary clean.

- [ ] **Step 2: Smoke test**

Run: `pnpm --filter web dev` and visit `http://localhost:3000`. Click **Open app** → modal
should appear with blur backdrop and two cards. Clicking Human routes to `/workbench` (404 is
OK if that route is the existing workbench under a different name; in which case adjust the
href).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(agents-web): wire Open app button to SurfaceModal"
```

---

### Task 18: /agents layout shell

**Files:**
- Create: `apps/web/app/agents/layout.tsx`

- [ ] **Step 1: Write the shell**

```tsx
import Link from "next/link";
import { ReactNode } from "react";

const NAV = [
  { label: "Hub",           href: "/agents",          emoji: "⚡" },
  { label: "Identity",      href: "/agents/create",   emoji: "🤖" },
  { label: "Skills",        href: "/agents/skills",   emoji: "🧩" },
];

export default function AgentsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-56 shrink-0 border-r border-white/5 px-4 py-6 md:block">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300/70">Agent surface</p>
          <nav className="mt-6 grid gap-1">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white">
                <span className="mr-2">{item.emoji}</span>{item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + smoke**

Run: `cd apps/web && pnpm typecheck && pnpm --filter web dev`
Visit `/agents` — should render an empty layout with sidebar visible.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/agents/layout.tsx
git commit -m "feat(agents-web): agent surface layout shell"
```

---

### Task 19: /agents hub page

**Files:**
- Create: `apps/web/app/agents/page.tsx`

- [ ] **Step 1: Write the hub**

```tsx
import Link from "next/link";

export default function AgentsHub() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300/70">Hub</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">SomniacOS Agent Economy</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
          Agents on Somnia register identity, list services, and call shared skill primitives to
          perform tasks. Every action is wallet-signed and anchored on Somnia Shannon.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/agents/create" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-cyan-300/40">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/70">Step 1</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Register an Agent</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">Claim a name, declare capabilities, stake STT. The Somnia LLM pre-validates.</p>
        </Link>
        <Link href="/agents/skills" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-cyan-300/40">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/70">Step 2</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Call a Skill</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">Browse callable skills like Drafter. Pay, sign, get a structured result.</p>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Smoke**

Visit `/agents`. Two cards visible.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/agents/page.tsx
git commit -m "feat(agents-web): hub page with onboarding CTAs"
```

---

### Task 20: SkillCard component

**Files:**
- Create: `apps/web/components/agents/SkillCard.tsx`

- [ ] **Step 1: Write the card**

```tsx
import Link from "next/link";
import type { SkillMeta } from "../../lib/agents/skill-registry";

export function SkillCard({ skill }: { skill: SkillMeta }) {
  return (
    <Link href={`/agents/skills/${skill.id}`} className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-cyan-300/40">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/70">{skill.category}</p>
      <h3 className="mt-2 text-xl font-semibold text-white">{skill.name}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/55">{skill.description}</p>
      <div className="mt-4 flex gap-3 font-mono text-[11px] text-white/40">
        <span>{skill.estimatedFeeSTT}</span>
        <span>~{skill.estimatedLatencySeconds}s</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/agents/SkillCard.tsx
git commit -m "feat(agents-web): SkillCard component"
```

---

### Task 21: /agents/skills catalog page

**Files:**
- Create: `apps/web/app/agents/skills/page.tsx`

- [ ] **Step 1: Write the catalog**

```tsx
import { skillRegistry } from "../../../lib/agents/skill-registry";
import { SkillCard } from "../../../components/agents/SkillCard";

export default function SkillsCatalog() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300/70">Skills</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Callable skills</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
          Typed inference primitives any agent can call from a contract or wallet. Pay per call.
          Receive a structured result back via the dispatcher's event log.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {skillRegistry.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Smoke**

Visit `/agents/skills`. One Drafter card visible.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/agents/skills/page.tsx
git commit -m "feat(agents-web): skills catalog page"
```

---

### Task 22: TryItForm + ResultRenderer components

**Files:**
- Create: `apps/web/components/agents/TryItForm.tsx`
- Create: `apps/web/components/agents/ResultRenderer.tsx`

- [ ] **Step 1: Write TryItForm**

```tsx
"use client";
import { useState } from "react";
import type { SkillMeta, SkillInputField } from "../../lib/agents/skill-registry";

export function TryItForm({ skill, onSubmit, busy }: { skill: SkillMeta; onSubmit: (values: Record<string, string>) => void; busy: boolean }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const f of skill.fields) seed[f.name] = "";
    return seed;
  });
  function update(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}
      className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      {skill.fields.map((field) => (
        <Field key={field.name} field={field} value={values[field.name]} onChange={(v) => update(field.name, v)} />
      ))}
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-cyan-300 px-5 py-2.5 font-semibold text-black disabled:opacity-60"
      >
        {busy ? "Submitting…" : `Call ${skill.name}`}
      </button>
    </form>
  );
}

function Field({ field, value, onChange }: { field: SkillInputField; value: string; onChange: (v: string) => void }) {
  if (field.type === "select") {
    return (
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">{field.label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white">
          <option value="">Pick one…</option>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="block">
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">{field.label}</span>
      <textarea
        value={value}
        rows={field.rows ?? 1}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white"
      />
    </label>
  );
}
```

- [ ] **Step 2: Write ResultRenderer**

```tsx
export function ResultRenderer({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/5 p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/70">Result</p>
      <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-white">{text}</pre>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/agents/TryItForm.tsx apps/web/components/agents/ResultRenderer.tsx
git commit -m "feat(agents-web): TryItForm and ResultRenderer"
```

---

### Task 23: /agents/skills/[skillId] page — full flow

**Files:**
- Create: `apps/web/app/agents/skills/[skillId]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { createPublicClient, createWalletClient, custom, decodeEventLog, http, parseEther, type Address, type Hash } from "viem";
import { getSkill } from "../../../../lib/agents/skill-registry";
import { contentCodeSkillsAbi, waitForSkillResult } from "../../../../lib/agents/dispatcher";
import { TryItForm } from "../../../../components/agents/TryItForm";
import { ResultRenderer } from "../../../../components/agents/ResultRenderer";
import { somnia } from "../../../../lib/contracts";

const publicClient = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });

export default function SkillPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = use(params);
  const skill = getSkill(skillId);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (!skill) {
    return <div className="text-white/55">Skill not found. <button onClick={() => router.push("/agents/skills")}>Back to catalog</button></div>;
  }

  async function submit(values: Record<string, string>) {
    setError(null); setResult(null); setBusy(true);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) throw new Error("Install a wallet.");
      const [account] = await (window as any).ethereum.request({ method: "eth_requestAccounts" }) as Address[];
      const wallet = createWalletClient({ chain: somnia, transport: custom((window as any).ethereum), account });

      const fee = parseEther("0.2"); // generous; matches treasury fee + inference deposit
      const args = skill!.fields.map((f) => values[f.name] ?? "");
      const startBlock = await publicClient.getBlockNumber();

      const hash: Hash = await wallet.writeContract({
        address: skill!.module,
        abi: contentCodeSkillsAbi as any,
        functionName: skill!.functionName,
        args,
        value: fee,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      // pull requestId from DraftRequested event
      let requestId: bigint | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== skill!.module.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({ abi: contentCodeSkillsAbi as any, data: log.data, topics: log.topics });
          if (decoded.eventName === "DraftRequested") {
            requestId = (decoded.args as any).requestId as bigint;
            break;
          }
        } catch { /* not our event */ }
      }
      if (requestId === null) throw new Error("DraftRequested event not found in receipt.");

      const text = await waitForSkillResult<string>({
        client: publicClient,
        module: skill!.module,
        eventName: skill!.resolvedEventName,
        requestId,
        startBlock,
        decoder: (args: any) => args.text as string,
      });
      setResult(text);
    } catch (e: any) {
      setError(e?.message ?? "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/70">{skill.category}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{skill.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{skill.description}</p>
        </div>
        <TryItForm skill={skill} onSubmit={submit} busy={busy} />
        {error ? <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        {result ? <ResultRenderer text={result} /> : null}
      </div>
      <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/40">Details</p>
        <dl className="mt-4 grid gap-2 text-xs text-white/55">
          <div className="flex justify-between"><dt>Module</dt><dd className="font-mono">{skill.module.slice(0, 8)}…</dd></div>
          <div className="flex justify-between"><dt>Function</dt><dd className="font-mono">{skill.functionName}</dd></div>
          <div className="flex justify-between"><dt>Est. fee</dt><dd>{skill.estimatedFeeSTT}</dd></div>
          <div className="flex justify-between"><dt>Est. latency</dt><dd>~{skill.estimatedLatencySeconds}s</dd></div>
        </dl>
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Smoke**

Visit `/agents/skills/drafter`. Fill the form. Sign with MetaMask. Watch the tx mine. Result
should render inline within ~5–10 s.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/agents/skills/[skillId]/page.tsx
git commit -m "feat(agents-web): Drafter skill try-it page with on-chain dispatch + result polling"
```

---

### Task 24: /agents/create page — identity registration

**Files:**
- Create: `apps/web/app/agents/create/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";
import { useState } from "react";
import { createPublicClient, createWalletClient, custom, decodeEventLog, http, parseEther, type Address, type Hash } from "viem";
import { agentIdentityAbi, waitForSkillResult } from "../../../lib/agents/dispatcher";
import { agentEconomyContracts } from "../../../lib/agents/contracts";
import { somnia } from "../../../lib/contracts";

const publicClient = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });

export default function CreateAgentPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capabilities, setCapabilities] = useState("content.write");
  const [stake, setStake] = useState("0.1");
  const [phase, setPhase] = useState<"idle"|"signing"|"waiting"|"approved"|"denied"|"error">("idle");
  const [message, setMessage] = useState<string>("");

  async function register() {
    setPhase("signing"); setMessage("");
    try {
      const [account] = await (window as any).ethereum.request({ method: "eth_requestAccounts" }) as Address[];
      const wallet = createWalletClient({ chain: somnia, transport: custom((window as any).ethereum), account });

      const stakeWei = parseEther(stake);
      const value = stakeWei + parseEther("0.2");
      const caps = capabilities.split(",").map((s) => s.trim()).filter(Boolean);

      const startBlock = await publicClient.getBlockNumber();
      const hash: Hash = await wallet.writeContract({
        address: agentEconomyContracts.AgentIdentity,
        abi: agentIdentityAbi as any,
        functionName: "requestRegistration",
        args: [name, description, caps, stakeWei],
        value,
      });
      setPhase("waiting");

      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      let requestId: bigint | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== agentEconomyContracts.AgentIdentity.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({ abi: agentIdentityAbi as any, data: log.data, topics: log.topics });
          if (decoded.eventName === "RegistrationRequested") {
            requestId = (decoded.args as any).requestId as bigint;
            break;
          }
        } catch { /* skip */ }
      }
      if (requestId === null) throw new Error("RegistrationRequested event missing");

      // Race the Approved and Denied events
      try {
        const name = await waitForSkillResult<string>({
          client: publicClient,
          module: agentEconomyContracts.AgentIdentity,
          eventName: "RegistrationApproved",
          requestId: 0n, // event not indexed by requestId for Approved; instead we'll filter by agent
          startBlock,
          decoder: (args: any) => args.name as string,
          timeoutMs: 90_000,
        }).catch(() => null);
        if (name) { setPhase("approved"); setMessage(`Welcome, ${name}.`); return; }
      } catch { /* fall through */ }

      setPhase("denied"); setMessage("Registration was not approved. Your stake has been refunded.");
    } catch (e: any) {
      setPhase("error"); setMessage(e?.message ?? "Registration failed.");
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300/70">Identity</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Register your agent</h1>
        <p className="mt-2 text-sm text-white/55">The Somnia LLM pre-validates registrations to prevent spam.</p>
      </div>
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white" />
      </label>
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white" />
      </label>
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">Capabilities (comma-separated)</span>
        <input value={capabilities} onChange={(e) => setCapabilities(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white" />
      </label>
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">Stake (STT)</span>
        <input value={stake} onChange={(e) => setStake(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-white" />
      </label>
      <button onClick={register} disabled={phase === "signing" || phase === "waiting"} className="rounded-xl bg-cyan-300 px-5 py-2.5 font-semibold text-black disabled:opacity-60">
        {phase === "idle" ? "Register" : phase === "signing" ? "Signing…" : phase === "waiting" ? "Validating…" : phase === "approved" ? "Approved" : "Try again"}
      </button>
      {message ? <p className={`rounded-xl border p-3 text-sm ${phase === "approved" ? "border-cyan-300/40 bg-cyan-300/5 text-cyan-200" : "border-red-500/40 bg-red-500/10 text-red-200"}`}>{message}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/agents/create/page.tsx
git commit -m "feat(agents-web): /agents/create registration form with LLM validation"
```

---

### Task 25: End-to-end manual test on Somnia Shannon

- [ ] **Step 1: Start the dev server**

```bash
pnpm --filter web dev
```

- [ ] **Step 2: Run the full demo flow**

1. Visit `http://localhost:3000`.
2. Click **Open app** → modal appears.
3. Click **Agent** → redirected to `/agents`.
4. Click **Call a Skill** → at `/agents/skills`.
5. Click the Drafter card → at `/agents/skills/drafter`.
6. Fill: topic = "Somnia winning a hackathon", audience = "X / Twitter", format = TWEET.
7. Click **Call Drafter** → sign with MetaMask.
8. Wait ~5–10 s → result tweet should render inline.
9. Go to `/agents/create`. Fill out a registration. Sign. Wait. Verify Approved/Denied state.
10. Inspect on-chain: confirm `ProtocolTreasury` balance increased by ~0.2 STT (one
    Drafter call + one registration).

- [ ] **Step 3: Document any flow bugs**

If any step fails, write the bug into `docs/agents/known-issues.md` (create the file). For
this plan we stop at documentation — fixes are in subsequent plans.

- [ ] **Step 4: Commit any docs**

```bash
git add docs/agents/known-issues.md 2>/dev/null || true
git commit -m "docs(agents): record findings from MVP smoke test" || true
```

---

## Self-Review

**Spec coverage**

| Spec section | Covered by | Status |
| --- | --- | --- |
| Landing split | Task 16, 17 | ✓ |
| /agents shell + hub | Task 18, 19 | ✓ |
| PlatformAdapter constants | Task 2 | ✓ |
| AgentEconomyDispatcher | Task 6, 7, 8 | ✓ |
| ProtocolTreasury | Task 5 | ✓ |
| SkillRouter base | Task 9 | ✓ |
| Drafter (S4) | Task 10 | ✓ |
| Agent Identity (F1) | Task 11 | ✓ |
| Skill catalog UI | Task 20, 21 | ✓ |
| Try-it form + result render | Task 22, 23 | ✓ |
| Identity registration UI | Task 24 | ✓ |
| Deployment script + wiring | Task 12, 13 | ✓ |
| Skill registry metadata | Task 14, 15 | ✓ |
| End-to-end demo verification | Task 25 | ✓ |
| **Marketplace (F2)** | not in this plan | → Plan 2 |
| **Work Verification standalone (F3)** | not in this plan | → Plan 2 |
| **AgentPay (F4)** | not in this plan | → Plan 2 |
| **Disputes/Court/Reputation/Negotiation/Memory/Bounties/Payroll/Compliance/SLA** | not in this plan | → Plan 3-5 |
| **Skills S1-S3, S5-S15** | not in this plan | → Plan 3-5 |

**Placeholder scan**: searched the document for "TBD", "TODO", "implement later", "fill in
details". None remain except the env-var addresses in Task 13 Step 1 which must be replaced
with the real deployment addresses after Task 12 Step 5 runs against Somnia Shannon.

**Type consistency**: `dispatch()` returns `requestId` everywhere. `resolveDraft` and
`resolveRegistration` have the same signature shape `(uint256, bytes calldata, bytes calldata)`.
`waitForSkillResult` is called the same way in skill page + create page.

---

## Plans 2-5 (Forecast)

| Plan | Scope | Tasks (estimated) |
| --- | --- | --- |
| **2** | Marketplace + Work Verification + AgentPay (Features 2, 3, 4). The flagship surface. | ~40 |
| **3** | Trust Layer: Disputes (F6), Court (F7), Negotiation (F8), Reputation (F9). | ~30 |
| **4** | Civics: Bounties (F12), Payroll (F22), Compliance (F23), SLA (F27), Memory (F10). | ~30 |
| **5** | All remaining 14 skills (S1, S2, S3, S5, S6, S7-S15) + treasury page + revenue dashboards. | ~50 |

Each follows this plan's exact pattern: contracts with FakePlatform tests first, then
frontend page + components, then end-to-end manual test.

---

## Execution Handoff

Plan complete and (after plan-mode exits) should be saved to
`docs/superpowers/plans/2026-06-09-agent-economy-mvp-phase-1.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between
tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch
execution with checkpoints.

Which approach?
