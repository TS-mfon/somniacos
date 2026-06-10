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
