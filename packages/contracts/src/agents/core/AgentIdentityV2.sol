// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../AgentEconomyDispatcherV2.sol";
import "../PlatformAdapter.sol";
import "../ProtocolTreasury.sol";
import "../lib/PullPaymentLib.sol";
import "../lib/TimeoutLib.sol";
import "../lib/VerdictParserLib.sol";

contract AgentIdentityV2 {
    using PullPaymentLib for PullPaymentLib.Ledger;
    using TimeoutLib for uint64;

    struct Profile {
        string name;
        string description;
        string[] capabilities;
        uint256 stake;
        uint256 reputation;
        uint256 totalEarned;
        uint256 completedJobs;
        uint256 disputes;
        uint64 registeredAt;
        bool active;
    }
    struct Pending {
        address agent;
        string name;
        string description;
        string[] capabilities;
        uint256 stake;
        uint64 deadline;
    }

    AgentEconomyDispatcherV2 public immutable dispatcher;
    ProtocolTreasury public immutable treasury;
    uint256 public immutable protocolFee;
    uint64 public immutable registrationTimeout;
    address public owner;
    bool private withdrawing;
    PullPaymentLib.Ledger private ledger;
    mapping(address => Profile) public profiles;
    mapping(uint256 => Pending) public pending;
    mapping(bytes32 => bool) public takenNames;
    mapping(address => bool) public authorizedModules;

    event RegistrationRequested(uint256 indexed requestId, address indexed agent, string name, uint64 deadline);
    event RegistrationApproved(address indexed agent, string name);
    event RegistrationDenied(address indexed agent, string reason);
    event RegistrationRecovered(uint256 indexed requestId, address indexed agent);
    event ModuleAuthorizationChanged(address indexed module, bool authorized);
    event ReputationChanged(address indexed agent, int256 delta, uint256 reputation, string reason);
    event EarningRecorded(address indexed agent, uint256 amount, uint256 totalEarned);
    event Withdrawal(address indexed account, uint256 amount);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    modifier onlyModule() { require(authorizedModules[msg.sender], "not module"); _; }

    constructor(AgentEconomyDispatcherV2 d, ProtocolTreasury t, uint256 fee, uint64 timeout_) {
        require(timeout_ != 0, "timeout");
        dispatcher = d;
        treasury = t;
        protocolFee = fee;
        registrationTimeout = timeout_;
        owner = msg.sender;
    }

    function requestRegistration(string calldata name, string calldata description, string[] calldata capabilities, uint256 stake) external payable returns (uint256 requestId) {
        uint256 deposit = dispatcher.requiredDeposit();
        require(msg.value == stake + protocolFee + deposit, "incorrect value");
        require(bytes(name).length != 0 && bytes(name).length < 32, "name length");
        require(stake >= 0.1 ether && !profiles[msg.sender].active, "invalid agent");
        bytes32 nameHash = keccak256(bytes(name));
        require(!takenNames[nameHash], "name taken");
        (bool paid,) = address(treasury).call{value: protocolFee}("");
        require(paid, "treasury");
        requestId = dispatcher.dispatchLLM{value: deposit}(
            string.concat("Name: ", name, "\nDescription: ", description),
            "Approve legitimate agent registrations. Respond only APPROVE: reason or DENY: reason.",
            this.resolveRegistration.selector,
            "",
            msg.sender
        );
        uint64 deadline = TimeoutLib.deadline(registrationTimeout);
        pending[requestId] = Pending(msg.sender, name, description, capabilities, stake, deadline);
        takenNames[nameHash] = true;
        emit RegistrationRequested(requestId, msg.sender, name, deadline);
    }

    function resolveRegistration(uint256 requestId, bytes calldata result, bytes calldata) external {
        require(msg.sender == address(dispatcher), "only dispatcher");
        Pending memory item = pending[requestId];
        if (item.agent == address(0)) return;
        delete pending[requestId];
        if (VerdictParserLib.startsWithIgnoreCase(result, bytes("APPROVE"))) {
            profiles[item.agent] = Profile(item.name, item.description, item.capabilities, item.stake, 500, 0, 0, 0, uint64(block.timestamp), true);
            emit RegistrationApproved(item.agent, item.name);
        } else {
            takenNames[keccak256(bytes(item.name))] = false;
            ledger.credit(item.agent, item.stake);
            emit RegistrationDenied(item.agent, string(result));
        }
    }

    function recoverTimedOutRegistration(uint256 requestId) external {
        Pending memory item = pending[requestId];
        require(item.agent != address(0) && item.deadline.expired(), "not expired");
        delete pending[requestId];
        takenNames[keccak256(bytes(item.name))] = false;
        ledger.credit(item.agent, item.stake);
        emit RegistrationRecovered(requestId, item.agent);
    }

    function setModule(address module, bool authorized) external onlyOwner {
        authorizedModules[module] = authorized;
        emit ModuleAuthorizationChanged(module, authorized);
    }

    function adjustReputation(address agent, int256 delta, string calldata reason) external onlyModule {
        Profile storage profile = profiles[agent];
        require(profile.active, "inactive");
        int256 next = int256(profile.reputation) + delta;
        profile.reputation = next < 0 ? 0 : next > 1000 ? 1000 : uint256(next);
        if (delta < 0) profile.disputes++;
        emit ReputationChanged(agent, delta, profile.reputation, reason);
    }

    function recordEarning(address agent, uint256 amount) external onlyModule {
        Profile storage profile = profiles[agent];
        require(profile.active, "inactive");
        profile.totalEarned += amount;
        profile.completedJobs++;
        emit EarningRecorded(agent, amount, profile.totalEarned);
    }

    function claimable(address account) external view returns (uint256) { return ledger.credits[account]; }
    function totalClaimable() external view returns (uint256) { return ledger.totalCredits; }
    function getCapabilities(address agent) external view returns (string[] memory) { return profiles[agent].capabilities; }

    function withdraw() external {
        require(!withdrawing, "reentrant");
        withdrawing = true;
        uint256 amount = ledger.withdraw(msg.sender);
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "withdraw");
        withdrawing = false;
        emit Withdrawal(msg.sender, amount);
    }
}
