// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/agents/AgentEconomyDispatcherV2.sol";
import "../../src/agents/ProtocolTreasury.sol";
import "../../src/agents/core/AgentIdentityV2.sol";
import "../../src/agents/lib/EscrowLib.sol";
import "../../src/agents/modules/EconomyWorkflowModule.sol";
import "./FakePlatform.sol";

contract V2Module {
    AgentEconomyDispatcherV2 dispatcher;
    bytes public result;
    constructor(AgentEconomyDispatcherV2 d) { dispatcher = d; }
    function fire() external payable returns (uint256) { return dispatcher.dispatchLLM{value: msg.value}("p", "s", this.resolve.selector, "", msg.sender); }
    function resolve(uint256, bytes calldata value, bytes calldata) external { require(msg.sender == address(dispatcher)); result = value; }
}

contract AgentEconomyV2Test is Test {
    FakePlatform platform;
    AgentEconomyDispatcherV2 dispatcher;
    ProtocolTreasury treasury;
    AgentIdentityV2 identity;
    V2Module module;
    address agent = address(0xA11CE);

    function setUp() public {
        platform = new FakePlatform();
        dispatcher = new AgentEconomyDispatcherV2(address(platform), 3, 0.07 ether, 0.07 ether);
        treasury = new ProtocolTreasury(address(this));
        identity = new AgentIdentityV2(dispatcher, treasury, 0.01 ether, 1 hours);
        module = new V2Module(dispatcher);
    }

    function testDispatcherRequiresExactDepositAndClearsBeforeResolve() public {
        vm.expectRevert(AgentEconomyDispatcherV2.IncorrectDeposit.selector);
        module.fire{value: 0.25 ether}();
        uint256 id = module.fire{value: 0.24 ether}();
        platform.deliver(id, "PASS: accepted");
        assertEq(string(module.result()), "PASS: accepted");
        (address target,,,,,) = dispatcher.pendingRequests(id);
        assertEq(target, address(0));
    }

    function testIdentityApprovalAndAuthorizedUpdates() public {
        uint256 id = _register("Atlas");
        platform.deliver(id, "approve: valid");
        (,,, uint256 reputation,,,,, bool active) = identity.profiles(agent);
        assertTrue(active);
        assertEq(reputation, 500);
        identity.setModule(address(this), true);
        identity.adjustReputation(agent, 600, "excellent");
        identity.recordEarning(agent, 2 ether);
        uint256 earned;
        uint256 jobs;
        (,,, reputation, earned, jobs,,,) = identity.profiles(agent);
        assertEq(reputation, 1000);
        assertEq(earned, 2 ether);
        assertEq(jobs, 1);
    }

    function testTimeoutCreditsPullPayment() public {
        uint256 id = _register("Slow");
        vm.warp(block.timestamp + 1 hours + 1);
        identity.recoverTimedOutRegistration(id);
        assertEq(identity.claimable(agent), 0.4 ether);
        uint256 before = agent.balance;
        vm.prank(agent);
        identity.withdraw();
        assertEq(agent.balance, before + 0.4 ether);
    }

    function _register(string memory name) private returns (uint256) {
        vm.deal(agent, 2 ether);
        string[] memory capabilities = new string[](1);
        capabilities[0] = "research.web";
        vm.prank(agent);
        return identity.requestRegistration{value: 0.65 ether}(name, "Proof-backed agent", capabilities, 0.4 ether);
    }
}

contract EconomyWorkflowModuleTest is Test {
    FakePlatform platform;
    AgentEconomyDispatcherV2 dispatcher;
    EconomyWorkflowModule module;
    address creator = address(0xCAFE);
    address worker = address(0xBEEF);

    function setUp() public {
        platform = new FakePlatform();
        dispatcher = new AgentEconomyDispatcherV2(address(platform), 3, 0.07 ether, 0.07 ether);
        module = new EconomyWorkflowModule(dispatcher, "Work Escrow", 1 hours);
        vm.deal(creator, 10 ether);
    }

    function testPassSettlementAndWithdrawal() public {
        vm.prank(creator);
        uint256 id = module.create{value: 1.24 ether}(worker, "delivery hash", "", AgentEconomyDispatcherV2.RequestMode.LLM);
        assertEq(module.totalEscrowed(), 1 ether);
        platform.deliver(id, "PASS: delivered");
        assertEq(module.claimable(worker), 1 ether);
        assertEq(module.liabilities(), 1 ether);
        vm.prank(worker);
        module.withdraw();
        assertEq(worker.balance, 1 ether);
        assertEq(module.liabilities(), 0);
    }

    function testSplitAndTimeoutPreserveLiabilities() public {
        vm.prank(creator);
        uint256 splitId = module.create{value: 1.24 ether}(worker, "partial", "", AgentEconomyDispatcherV2.RequestMode.LLM);
        platform.deliver(splitId, "SPLIT 2500: partial");
        assertEq(module.claimable(worker), 0.25 ether);
        assertEq(module.claimable(creator), 0.75 ether);
        assertEq(module.liabilities(), address(module).balance);

        vm.prank(creator);
        uint256 slowId = module.create{value: 2.24 ether}(worker, "slow", "", AgentEconomyDispatcherV2.RequestMode.LLM);
        vm.warp(block.timestamp + 1 hours + 1);
        module.recover(slowId);
        assertEq(module.claimable(creator), 2.75 ether);
        assertEq(module.liabilities(), address(module).balance);
    }
}

contract EscrowLibHarness {
    using EscrowLib for EscrowLib.Slot;
    EscrowLib.Slot slot;
    function lock(uint256 amount) external { slot.lock(amount); }
    function split(uint256 bps) external returns (uint256, uint256) { return slot.split(bps); }
}

contract EscrowLibTest is Test {
    function testSplitPreservesLiability() public {
        EscrowLibHarness harness = new EscrowLibHarness();
        harness.lock(101);
        (uint256 first, uint256 second) = harness.split(3333);
        assertEq(first + second, 101);
    }
}
