// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../AgentEconomyDispatcher.sol";
import "../ProtocolTreasury.sol";

/// @title SkillRouter
/// @notice Abstract base for skill modules. Handles fee splitting + dispatch wiring.
abstract contract SkillRouter {
    AgentEconomyDispatcher public immutable dispatcher;
    ProtocolTreasury       public immutable treasury;

    /// @notice Per-call protocol fee on top of platform's deposit, in wei.
    uint256 public protocolFee;

    event ProtocolFeeUpdated(uint256 newFee);

    constructor(AgentEconomyDispatcher d, ProtocolTreasury t, uint256 initialFee) {
        dispatcher  = d;
        treasury    = t;
        protocolFee = initialFee;
    }

    function _fireInference(
        uint256 agentId,
        string memory prompt,
        bytes4 resolveSelector,
        bytes memory context
    ) internal returns (uint256 requestId) {
        // Caller forwarded msg.value; we keep `protocolFee` and send the rest to the platform.
        uint256 toPlatform = msg.value - protocolFee;
        // Pay treasury synchronously so failed inference still funds the protocol.
        (bool paid, ) = address(treasury).call{value: protocolFee}("");
        require(paid, "treasury pay");
        requestId = dispatcher.dispatch{value: toPlatform}(
            agentId,
            prompt,
            resolveSelector,
            context,
            msg.sender
        );
    }
}
