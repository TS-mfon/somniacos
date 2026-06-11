// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/agents/ProtocolTreasury.sol";
import "../src/agents/AgentEconomyDispatcherV2.sol";
import "../src/agents/core/AgentIdentityV2.sol";
import "../src/agents/modules/EconomyWorkflowModule.sol";

contract DeployAgentEconomy is Script {
    address constant PLATFORM = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;
    // Mirrors the live SomniacAgentRouterV2 economics.
    uint256 constant SUBCOMMITTEE_SIZE = 3;
    uint256 constant PRICE_PER_AGENT = 0.07 ether;
    uint64 constant TIMEOUT = 1 hours;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PK");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        ProtocolTreasury treasury = new ProtocolTreasury(deployer);
        AgentEconomyDispatcherV2 dispatcher = new AgentEconomyDispatcherV2(PLATFORM, SUBCOMMITTEE_SIZE, PRICE_PER_AGENT, PRICE_PER_AGENT);
        AgentIdentityV2 identity = new AgentIdentityV2(dispatcher, treasury, 0.01 ether, TIMEOUT);
        EconomyWorkflowModule drafter = new EconomyWorkflowModule(dispatcher, "Drafter", TIMEOUT);
        EconomyWorkflowModule websiteResearch = new EconomyWorkflowModule(dispatcher, "Website Research", TIMEOUT);
        EconomyWorkflowModule marketplace = new EconomyWorkflowModule(dispatcher, "Marketplace", TIMEOUT);
        EconomyWorkflowModule workVerification = new EconomyWorkflowModule(dispatcher, "Work Verification", TIMEOUT);
        EconomyWorkflowModule agentPay = new EconomyWorkflowModule(dispatcher, "AgentPay", TIMEOUT);
        EconomyWorkflowModule workEscrow = new EconomyWorkflowModule(dispatcher, "Work Escrow", TIMEOUT);
        EconomyWorkflowModule court = new EconomyWorkflowModule(dispatcher, "Disputes Court", TIMEOUT);
        EconomyWorkflowModule reputation = new EconomyWorkflowModule(dispatcher, "Reputation Assessment", TIMEOUT);
        EconomyWorkflowModule negotiation = new EconomyWorkflowModule(dispatcher, "Negotiation", TIMEOUT);
        EconomyWorkflowModule memoryModule = new EconomyWorkflowModule(dispatcher, "Memory Authorization", TIMEOUT);
        EconomyWorkflowModule bounties = new EconomyWorkflowModule(dispatcher, "Bounties", TIMEOUT);
        EconomyWorkflowModule payroll = new EconomyWorkflowModule(dispatcher, "Payroll", TIMEOUT);
        EconomyWorkflowModule compliance = new EconomyWorkflowModule(dispatcher, "Compliance", TIMEOUT);
        EconomyWorkflowModule sla = new EconomyWorkflowModule(dispatcher, "SLA", TIMEOUT);
        EconomyWorkflowModule sentinel = new EconomyWorkflowModule(dispatcher, "Sentinel", TIMEOUT);

        identity.setModule(address(workVerification), true);
        identity.setModule(address(workEscrow), true);
        identity.setModule(address(court), true);
        identity.setModule(address(reputation), true);
        identity.setModule(address(bounties), true);
        identity.setModule(address(payroll), true);
        identity.setModule(address(sla), true);

        vm.stopBroadcast();

        console.log("ProtocolTreasury     ", address(treasury));
        console.log("AgentEconomyDispatcherV2", address(dispatcher));
        console.log("AgentIdentityV2", address(identity));
        console.log("Drafter", address(drafter));
        console.log("WebsiteResearch", address(websiteResearch));
        console.log("Marketplace", address(marketplace));
        console.log("WorkVerification", address(workVerification));
        console.log("AgentPay", address(agentPay));
        console.log("WorkEscrow", address(workEscrow));
        console.log("Court", address(court));
        console.log("Reputation", address(reputation));
        console.log("Negotiation", address(negotiation));
        console.log("Memory", address(memoryModule));
        console.log("Bounties", address(bounties));
        console.log("Payroll", address(payroll));
        console.log("Compliance", address(compliance));
        console.log("SLA", address(sla));
        console.log("Sentinel", address(sentinel));
    }
}
