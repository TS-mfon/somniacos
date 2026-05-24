// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/SomniacOS.sol";

contract SomniacOSTest {
    function testAgentCreation() public {
        AgentRegistry registry = new AgentRegistry();
        uint256 id = registry.createAgent(address(0xBEEF), "ipfs://agent", "marketing,research");
        (address owner, address wallet,,,) = registry.agents(id);
        require(owner == address(this), "owner mismatch");
        require(wallet == address(0xBEEF), "wallet mismatch");
    }

    function testTaskPosting() public {
        Marketplace market = new Marketplace();
        uint256 id = market.postTask(100 ether, "ipfs://task");
        (address creator, uint256 budget,, Marketplace.TaskStatus status,) = market.tasks(id);
        require(creator == address(this), "creator mismatch");
        require(budget == 100 ether, "budget mismatch");
        require(status == Marketplace.TaskStatus.Open, "status mismatch");
    }
}
