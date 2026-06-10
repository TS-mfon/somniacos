// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SkillRouter.sol";
import "../PlatformAdapter.sol";

/// @title ContentCodeSkills
/// @notice MVP exposes Drafter (S4). Lint + Explain are placeholders for plan 2.
contract ContentCodeSkills is SkillRouter {
    struct Result {
        string text;
        bool   resolved;
    }
    mapping(uint256 => Result) public results;
    mapping(uint256 => address) public callerOf;

    event DraftRequested(uint256 indexed requestId, address indexed caller, string topic, string audience, string format);
    event DraftResolved(uint256 indexed requestId, string text);

    constructor(AgentEconomyDispatcher d, ProtocolTreasury t, uint256 fee)
        SkillRouter(d, t, fee)
    {}

    /// @notice Generates short-form text. Returns requestId.
    function draft(
        string calldata topic,
        string calldata audience,
        string calldata format
    ) external payable returns (uint256 requestId) {
        require(bytes(topic).length > 0 && bytes(topic).length < 280, "topic length");
        require(bytes(format).length > 0, "format");
        require(msg.value >= callPrice(), "underfunded");

        string memory system =
            "You are a professional copywriter for the SomniacOS Agent Economy. "
            "Produce only the final, ready-to-publish text. No preamble, no quotes, no meta commentary.";
        string memory prompt = string.concat(
            "Write content for audience: ", audience,
            ". Format: ", format,
            ". Topic: ", topic
        );

        requestId = _fireInference(
            PlatformAdapter.LLM_AGENT_ID,
            prompt,
            system,
            this.resolveDraft.selector,
            ""
        );
        callerOf[requestId] = msg.sender;
        emit DraftRequested(requestId, msg.sender, topic, audience, format);
    }

    function resolveDraft(uint256 requestId, bytes calldata result, bytes calldata) external {
        require(msg.sender == address(dispatcher), "only dispatcher");
        string memory text = string(result);
        results[requestId] = Result({text: text, resolved: true});
        emit DraftResolved(requestId, text);
    }
}
