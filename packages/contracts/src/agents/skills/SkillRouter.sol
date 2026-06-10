// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../AgentEconomyDispatcher.sol";
import "../ProtocolTreasury.sol";

/// @title SkillRouter
/// @notice Abstract base for skill modules. Handles fee splitting + dispatch wiring.
abstract contract SkillRouter {
    AgentEconomyDispatcher public immutable dispatcher;
    ProtocolTreasury       public immutable treasury;

    /// @notice Per-call protocol fee on top of the platform deposit, in wei.
    uint256 public protocolFee;

    event ProtocolFeeUpdated(uint256 newFee);

    constructor(AgentEconomyDispatcher d, ProtocolTreasury t, uint256 initialFee) {
        dispatcher  = d;
        treasury    = t;
        protocolFee = initialFee;
    }

    /// @notice Total STT a caller must forward to a skill: protocol fee + platform deposit.
    function callPrice() public view returns (uint256) {
        return protocolFee + dispatcher.requiredDeposit();
    }

    function _fireInference(
        uint256 agentId,
        string memory prompt,
        string memory system,
        bytes4 resolveSelector,
        bytes memory context
    ) internal returns (uint256 requestId) {
        // Caller forwarded msg.value; keep `protocolFee`, send the rest to the platform.
        uint256 toPlatform = msg.value - protocolFee;
        // Pay treasury synchronously so failed inference still funds the protocol.
        (bool paid, ) = address(treasury).call{value: protocolFee}("");
        require(paid, "treasury pay");
        requestId = dispatcher.dispatch{value: toPlatform}(
            agentId,
            prompt,
            system,
            resolveSelector,
            context,
            msg.sender
        );
    }
}
