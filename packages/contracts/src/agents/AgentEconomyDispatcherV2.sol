// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentEconomyDispatcher.sol";

interface IWebsiteParserAgentV2 {
    function ExtractString(
        string calldata key,
        string calldata description,
        string[] calldata options,
        string calldata prompt,
        string calldata url,
        bool resolveUrl,
        uint8 numPages,
        uint8 confidenceThreshold
    ) external returns (string memory output);
}

contract AgentEconomyDispatcherV2 {
    enum RequestMode { LLM, Website }
    struct Pending { address module; bytes4 selector; bytes context; address initiator; RequestMode mode; uint64 createdAt; }
    address public immutable PLATFORM;
    uint256 public immutable subcommitteeSize;
    uint256 public immutable llmPricePerAgent;
    uint256 public immutable websitePricePerAgent;
    address public owner;
    mapping(uint256 => Pending) public pendingRequests;

    event Dispatched(uint256 indexed requestId, address indexed module, address indexed initiator, uint256 agentId, RequestMode mode);
    event RequestResolved(uint256 indexed requestId, address indexed module, address indexed initiator, uint8 status, bytes32 resultHash, bool resolverSucceeded);
    event ResolverFailed(uint256 indexed requestId, address indexed module);
    error OnlyPlatform();
    error IncorrectDeposit();

    constructor(address platform_, uint256 subcommitteeSize_, uint256 llmPricePerAgent_, uint256 websitePricePerAgent_) {
        require(platform_ != address(0) && subcommitteeSize_ != 0, "invalid config");
        PLATFORM = platform_;
        subcommitteeSize = subcommitteeSize_;
        llmPricePerAgent = llmPricePerAgent_;
        websitePricePerAgent = websitePricePerAgent_;
        owner = msg.sender;
    }

    function requiredDeposit() public view returns (uint256) {
        return requiredDepositFor(RequestMode.LLM);
    }

    function requiredDepositFor(RequestMode mode) public view returns (uint256) {
        uint256 price = mode == RequestMode.Website ? websitePricePerAgent : llmPricePerAgent;
        return ISomniaAgentPlatformV2(PLATFORM).getRequestDeposit() + price * subcommitteeSize;
    }

    function dispatchLLM(string calldata prompt, string calldata system, bytes4 selector, bytes calldata context, address initiator) external payable returns (uint256 requestId) {
        if (msg.value != requiredDepositFor(RequestMode.LLM)) revert IncorrectDeposit();
        string[] memory allowed = new string[](0);
        bytes memory payload = abi.encodeWithSelector(ILLMInferenceAgentV2.inferString.selector, prompt, system, false, allowed);
        requestId = _dispatch(PlatformAdapter.LLM_AGENT_ID, RequestMode.LLM, payload, selector, context, initiator);
    }

    function dispatchWebsite(string calldata url, string calldata prompt, bytes4 selector, bytes calldata context, address initiator) external payable returns (uint256 requestId) {
        if (msg.value != requiredDepositFor(RequestMode.Website)) revert IncorrectDeposit();
        require(bytes(url).length != 0, "url required");
        string[] memory options = new string[](0);
        bytes memory payload = abi.encodeWithSelector(
            IWebsiteParserAgentV2.ExtractString.selector,
            "somniacos_result",
            "Extract the source evidence required by the requesting SomniacOS economy module.",
            options,
            prompt,
            url,
            false,
            uint8(3),
            uint8(60)
        );
        requestId = _dispatch(PlatformAdapter.WEB_AGENT_ID, RequestMode.Website, payload, selector, context, initiator);
    }

    function _dispatch(uint256 agentId, RequestMode mode, bytes memory payload, bytes4 selector, bytes calldata context, address initiator) private returns (uint256 requestId) {
        requestId = ISomniaAgentPlatformV2(PLATFORM).createRequest{value: msg.value}(agentId, address(this), this.handleAgentResponse.selector, payload);
        pendingRequests[requestId] = Pending(msg.sender, selector, context, initiator, mode, uint64(block.timestamp));
        emit Dispatched(requestId, msg.sender, initiator, agentId, mode);
    }

    function handleAgentResponse(uint256 requestId, AgentEconomyDispatcher.Response[] calldata responses, AgentEconomyDispatcher.ResponseStatus status, AgentEconomyDispatcher.Request calldata) external {
        if (msg.sender != PLATFORM) revert OnlyPlatform();
        Pending memory p = pendingRequests[requestId];
        if (p.module == address(0)) return;
        delete pendingRequests[requestId];
        bytes memory result = _result(responses, status);
        (bool ok,) = p.module.call(abi.encodeWithSelector(p.selector, requestId, result, p.context));
        if (!ok) emit ResolverFailed(requestId, p.module);
        emit RequestResolved(requestId, p.module, p.initiator, uint8(status), keccak256(result), ok);
    }

    function _result(AgentEconomyDispatcher.Response[] calldata responses, AgentEconomyDispatcher.ResponseStatus status) private view returns (bytes memory) {
        if (status == AgentEconomyDispatcher.ResponseStatus.TimedOut) return bytes("FAILED: platform request timed out");
        if (status == AgentEconomyDispatcher.ResponseStatus.Failed) return bytes("FAILED: platform request failed");
        if (responses.length == 0 || responses[0].result.length == 0) return bytes("FAILED: empty platform response");
        try this.decodeResult(responses[0].result) returns (string memory text) { return bytes(text); } catch { return bytes("FAILED: malformed platform response"); }
    }

    function decodeResult(bytes calldata encoded) external pure returns (string memory) { return abi.decode(encoded, (string)); }
}
