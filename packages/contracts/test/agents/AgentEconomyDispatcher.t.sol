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
