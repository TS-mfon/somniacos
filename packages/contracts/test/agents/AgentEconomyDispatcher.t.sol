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
            "system",
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
        // subcommitteeSize=3, llmPricePerAgent=0.07 — mirrors the live router.
        dispatcher = new AgentEconomyDispatcher(address(platform), address(0xDEAD), 3, 0.07 ether);
        module     = new MockModule(dispatcher);
    }

    function testRequiredDeposit() public view {
        // 0.03 platform deposit + 0.07 * 3 = 0.24
        assertEq(dispatcher.requiredDeposit(), 0.24 ether);
    }

    function testDispatchStoresPending() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        uint256 requestId = module.fire{value: 0.24 ether}("hello", abi.encode("ctx-1"));

        (address modAddr, bytes4 sel, bytes memory ctx, address initiator) = dispatcher.pendingRequests(requestId);
        assertEq(modAddr, address(module));
        assertEq(sel, MockModule.resolve.selector);
        assertEq(initiator, user);
        assertEq(abi.decode(ctx, (string)), "ctx-1");
    }

    function testHandleAgentResponseForwardsToModule() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        uint256 requestId = module.fire{value: 0.24 ether}("hello", abi.encode("ctx-2"));

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
        AgentEconomyDispatcher.Response[] memory empty;
        AgentEconomyDispatcher.Request memory req;
        dispatcher.handleAgentResponse(0, empty, AgentEconomyDispatcher.ResponseStatus.Success, req);
    }
}
