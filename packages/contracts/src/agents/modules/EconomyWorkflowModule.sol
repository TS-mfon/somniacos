// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../AgentEconomyDispatcherV2.sol";
import "../lib/PullPaymentLib.sol";
import "../lib/TimeoutLib.sol";
import "../lib/VerdictParserLib.sol";

/// @notice Hardened funded workflow primitive. It is deployed once per named economy
/// module so each product has isolated liabilities, pause controls, records and withdrawals.
contract EconomyWorkflowModule {
    using PullPaymentLib for PullPaymentLib.Ledger;
    using TimeoutLib for uint64;

    enum State { None, Pending, Pass, Fail, Split, Recovered, Cancelled }
    struct Workflow {
        address creator;
        address beneficiary;
        uint256 amount;
        uint64 createdAt;
        uint64 deadline;
        State state;
        uint16 splitBps;
        AgentEconomyDispatcherV2.RequestMode mode;
        string sourceUrl;
        string evidence;
        string result;
        bytes32 callbackProof;
    }

    AgentEconomyDispatcherV2 public immutable dispatcher;
    string public moduleName;
    uint64 public timeout;
    address public owner;
    bool public paused;
    bool private withdrawing;
    uint256 public totalEscrowed;
    uint256[] private ids;
    PullPaymentLib.Ledger private ledger;
    mapping(uint256 => Workflow) public workflows;

    event WorkflowRequested(uint256 indexed requestId, address indexed creator, address indexed beneficiary, uint256 amount, AgentEconomyDispatcherV2.RequestMode mode, string sourceUrl, uint64 deadline);
    event WorkflowResolved(uint256 indexed requestId, State state, uint16 splitBps, bytes32 callbackProof, string result);
    event WorkflowRecovered(uint256 indexed requestId);
    event Withdrawal(address indexed account, uint256 amount);
    event Paused(bool paused);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor(AgentEconomyDispatcherV2 dispatcher_, string memory name_, uint64 timeout_) {
        require(address(dispatcher_) != address(0) && timeout_ != 0, "invalid config");
        dispatcher = dispatcher_;
        moduleName = name_;
        timeout = timeout_;
        owner = msg.sender;
    }

    function create(
        address beneficiary,
        string calldata evidence,
        string calldata sourceUrl,
        AgentEconomyDispatcherV2.RequestMode mode
    ) external payable returns (uint256 requestId) {
        require(!paused && beneficiary != address(0) && bytes(evidence).length != 0, "invalid request");
        uint256 deposit = dispatcher.requiredDepositFor(mode);
        require(msg.value > deposit, "funding required");
        uint256 amount = msg.value - deposit;
        bytes memory context = abi.encode(msg.sender, beneficiary, amount);
        string memory prompt = string.concat(
            "Module: ", moduleName, "\nEvidence: ", evidence,
            "\nReturn only PASS: reason, FAIL: reason, or SPLIT <0-10000>: reason."
        );
        if (mode == AgentEconomyDispatcherV2.RequestMode.Website) {
            requestId = dispatcher.dispatchWebsite{value: deposit}(sourceUrl, prompt, this.resolve.selector, context, msg.sender);
        } else {
            requestId = dispatcher.dispatchLLM{value: deposit}(
                prompt,
                "Judge the evidence conservatively and return exactly one supported settlement verdict.",
                this.resolve.selector,
                context,
                msg.sender
            );
        }
        uint64 deadline = TimeoutLib.deadline(timeout);
        workflows[requestId] = Workflow(msg.sender, beneficiary, amount, uint64(block.timestamp), deadline, State.Pending, 0, mode, sourceUrl, evidence, "", bytes32(0));
        ids.push(requestId);
        totalEscrowed += amount;
        emit WorkflowRequested(requestId, msg.sender, beneficiary, amount, mode, sourceUrl, deadline);
    }

    function resolve(uint256 requestId, bytes calldata result, bytes calldata context) external {
        require(msg.sender == address(dispatcher), "only dispatcher");
        Workflow storage item = workflows[requestId];
        if (item.state != State.Pending) return;
        (address creator, address beneficiary, uint256 amount) = abi.decode(context, (address, address, uint256));
        if (creator != item.creator || beneficiary != item.beneficiary || amount != item.amount) return;
        item.result = string(result);
        item.callbackProof = keccak256(abi.encode(requestId, result, context, block.chainid));
        totalEscrowed -= amount;
        if (VerdictParserLib.startsWithIgnoreCase(result, bytes("PASS"))) {
            item.state = State.Pass;
            ledger.credit(beneficiary, amount);
        } else if (VerdictParserLib.startsWithIgnoreCase(result, bytes("SPLIT"))) {
            (uint256 bps, bool ok) = VerdictParserLib.boundedInteger(result, 5, 10_000);
            item.state = State.Split;
            item.splitBps = uint16(ok ? bps : 5_000);
            uint256 beneficiaryAmount = amount * item.splitBps / 10_000;
            ledger.credit(beneficiary, beneficiaryAmount);
            ledger.credit(creator, amount - beneficiaryAmount);
        } else {
            item.state = State.Fail;
            ledger.credit(creator, amount);
        }
        emit WorkflowResolved(requestId, item.state, item.splitBps, item.callbackProof, item.result);
    }

    function recover(uint256 requestId) external {
        Workflow storage item = workflows[requestId];
        require(item.state == State.Pending && item.deadline.expired(), "not recoverable");
        item.state = State.Recovered;
        totalEscrowed -= item.amount;
        ledger.credit(item.creator, item.amount);
        emit WorkflowRecovered(requestId);
    }

    function setPaused(bool next) external onlyOwner { paused = next; emit Paused(next); }
    function setTimeout(uint64 next) external onlyOwner { require(next != 0, "timeout"); timeout = next; }
    function claimable(address account) external view returns (uint256) { return ledger.credits[account]; }
    function totalClaimable() external view returns (uint256) { return ledger.totalCredits; }
    function liabilities() external view returns (uint256) { return totalEscrowed + ledger.totalCredits; }
    function workflowCount() external view returns (uint256) { return ids.length; }
    function workflowIds(uint256 offset, uint256 limit) external view returns (uint256[] memory page) {
        if (offset >= ids.length) return new uint256[](0);
        uint256 end = offset + limit > ids.length ? ids.length : offset + limit;
        page = new uint256[](end - offset);
        for (uint256 i = offset; i < end; ++i) page[i - offset] = ids[i];
    }

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
