// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PlatformAdapter.sol";

/// @notice The real Somnia Agents Platform interface, mirrored from the live
///         SomniacAgentRouterV2 integration. Do not invent signatures.
interface ISomniaAgentPlatformV2 {
    function createRequest(
        uint256 agentId,
        address callbackAddress,
        bytes4 callbackSelector,
        bytes calldata payload
    ) external payable returns (uint256 requestId);
    function getRequestDeposit() external view returns (uint256);
}

/// @notice The LLM inference agent the platform routes to. The payload sent to
///         createRequest must be an abi-encoded call to inferString.
interface ILLMInferenceAgentV2 {
    function inferString(
        string calldata prompt,
        string calldata system,
        bool chainOfThought,
        string[] calldata allowedValues
    ) external returns (string memory response);
}

/// @title AgentEconomyDispatcher
/// @notice The single contract registered with the Somnia Agents Platform as the callback
///         target for every Agent Economy module. Modules call `dispatch()` to submit an
///         inference; the platform later calls `handleAgentResponse()` here, which decodes
///         the validator result and forwards it to the originating module's resolver.
contract AgentEconomyDispatcher {
    enum ResponseStatus { Success, Failed, TimedOut }
    enum ConsensusType { Majority, Threshold }

    struct Response {
        address validator;
        bytes result;
        ResponseStatus status;
        uint256 receipt;
        uint256 timestamp;
        uint256 executionCost;
    }

    struct Request {
        uint256 id;
        address requester;
        address callbackAddress;
        bytes4 callbackSelector;
        address[] subcommittee;
        Response[] responses;
        uint256 responseCount;
        uint256 failureCount;
        uint256 threshold;
        uint256 createdAt;
        uint256 deadline;
        ResponseStatus status;
        ConsensusType consensusType;
        uint256 remainingBudget;
    }

    struct Pending {
        address module;            // module that initiated; receives the resolver callback
        bytes4  resolveSelector;   // module's resolver function selector
        bytes   context;           // arbitrary context the module wants echoed back
        address initiator;         // original EOA / contract that triggered the dispatch
    }

    address public immutable PLATFORM;
    uint256 public immutable subcommitteeSize;
    uint256 public immutable llmPricePerAgent;
    address public treasury;
    address public owner;

    mapping(uint256 => Pending) public pendingRequests;

    event Dispatched(
        uint256 indexed requestId,
        address indexed module,
        address indexed initiator,
        uint256 agentId
    );
    event InferenceResult(uint256 indexed requestId, address indexed module, uint8 status);
    event ResolverFailed(uint256 indexed requestId, address indexed module);

    error OnlyPlatform();
    error OnlyOwner();

    constructor(
        address platform_,
        address treasury_,
        uint256 subcommitteeSize_,
        uint256 llmPricePerAgent_
    ) {
        PLATFORM = platform_;
        treasury = treasury_;
        subcommitteeSize = subcommitteeSize_;
        llmPricePerAgent = llmPricePerAgent_;
        owner = msg.sender;
    }

    function setTreasury(address next) external {
        if (msg.sender != owner) revert OnlyOwner();
        treasury = next;
    }

    /// @notice The exact STT a caller must forward to dispatch() for one LLM inference,
    ///         mirroring the live SomniacAgentRouterV2 deposit formula.
    function requiredDeposit() public view returns (uint256) {
        return ISomniaAgentPlatformV2(PLATFORM).getRequestDeposit()
            + llmPricePerAgent * subcommitteeSize;
    }

    /// @notice Submit an LLM inference. The caller forwards exactly `requiredDeposit()`.
    function dispatch(
        uint256 agentId,
        string calldata prompt,
        string calldata system,
        bytes4 resolveSelector,
        bytes calldata context,
        address initiator
    ) external payable returns (uint256 requestId) {
        string[] memory allowedValues = new string[](0);
        bytes memory payload = abi.encodeWithSelector(
            ILLMInferenceAgentV2.inferString.selector,
            prompt,
            system,
            false,
            allowedValues
        );

        requestId = ISomniaAgentPlatformV2(PLATFORM).createRequest{value: msg.value}(
            agentId,
            address(this),
            this.handleAgentResponse.selector,
            payload
        );

        pendingRequests[requestId] = Pending({
            module:          msg.sender,
            resolveSelector: resolveSelector,
            context:         context,
            initiator:       initiator
        });
        emit Dispatched(requestId, msg.sender, initiator, agentId);
    }

    /// @notice Platform callback. Decodes the validator string result and forwards the raw
    ///         text bytes to the originating module's resolver.
    function handleAgentResponse(
        uint256 requestId,
        Response[] calldata responses,
        ResponseStatus status,
        Request calldata
    ) external {
        if (msg.sender != PLATFORM) revert OnlyPlatform();

        Pending memory p = pendingRequests[requestId];
        if (p.module == address(0)) return; // unknown — silent ignore, never revert

        emit InferenceResult(requestId, p.module, uint8(status));

        if (responses.length > 0 && responses[0].result.length > 0) {
            string memory text = abi.decode(responses[0].result, (string));
            (bool ok, ) = p.module.call(
                abi.encodeWithSelector(p.resolveSelector, requestId, bytes(text), p.context)
            );
            if (!ok) emit ResolverFailed(requestId, p.module);
        }
        delete pendingRequests[requestId];
    }
}
