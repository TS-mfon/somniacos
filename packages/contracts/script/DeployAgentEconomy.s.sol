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
