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
