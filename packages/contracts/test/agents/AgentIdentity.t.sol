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

        (string memory name, , uint256 staked, , , bool active) = identity.agents(agent);
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

        ( , , uint256 staked, , , bool active) = identity.agents(agent);
        assertFalse(active);
        assertEq(staked, 0);
        assertEq(agent.balance, balBefore + 0.4 ether);
    }
}
