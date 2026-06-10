// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PlatformAdapter.sol";

interface ISomniaAgentsPlatformMin {
    struct AgentResponse {
        address agentAddress;
        bytes   result;
        uint8   status;
        uint256 requestId;
        uint256 agentId;
        uint256 fee;
    }
    function createRequest(
        address callbackContract,
        bytes4  callbackSelector,
        uint256 agentId,
        string  calldata prompt,
        uint256 deposit
    ) external payable returns (uint256 requestId);
    function getTotalDue(uint256 agentId, uint256 subcommitteeSize) external view returns (uint256);
}

/// @title AgentEconomyDispatcher
/// @notice The single contract registered with the Somnia Agents Platform as the callback
///         target for every Agent Economy module. Modules call `dispatch()` to submit an
///         inference; the platform later calls `handleAgentResponse()` here, which forwards
///         the result to the originating module's resolver. One platform callback, many
///         modules.
contract AgentEconomyDispatcher {
    struct Pending {
        address module;            // module that initiated; receives the resolver callback
        bytes4  resolveSelector;   // module's resolver function selector
        bytes   context;           // arbitrary context the module wants echoed back
        address initiator;         // original EOA / contract that triggered the dispatch
    }

    address public immutable PLATFORM;
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

    constructor(address platform_, address treasury_) {
        PLATFORM = platform_;
        treasury = treasury_;
        owner = msg.sender;
    }

    function setTreasury(address next) external {
        if (msg.sender != owner) revert OnlyOwner();
        treasury = next;
    }

    function dispatch(
        uint256 agentId,
        string calldata prompt,
        bytes4 resolveSelector,
        bytes calldata context,
        address initiator
    ) external payable returns (uint256 requestId) {
        requestId = ISomniaAgentsPlatformMin(PLATFORM).createRequest{value: msg.value}(
            address(this),
            PlatformAdapter.CALLBACK_SELECTOR,
            agentId,
            prompt,
            msg.value
        );
        pendingRequests[requestId] = Pending({
            module:          msg.sender,
            resolveSelector: resolveSelector,
            context:         context,
            initiator:       initiator
        });
        emit Dispatched(requestId, msg.sender, initiator, agentId);
    }

    function handleAgentResponse(
        uint256 requestId,
        ISomniaAgentsPlatformMin.AgentResponse[] calldata responses,
        uint8 status,
        bytes calldata
    ) external {
        if (msg.sender != PLATFORM) revert OnlyPlatform();

        Pending memory p = pendingRequests[requestId];
        if (p.module == address(0)) return; // unknown — silent ignore, never revert

        emit InferenceResult(requestId, p.module, status);

        if (status == 2 && responses.length > 0) {
            (bool ok, ) = p.module.call(
                abi.encodeWithSelector(p.resolveSelector, requestId, responses[0].result, p.context)
            );
            if (!ok) emit ResolverFailed(requestId, p.module);
        }
        delete pendingRequests[requestId];
    }
}
