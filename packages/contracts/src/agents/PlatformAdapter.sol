// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PlatformAdapter
/// @notice Pure constants shared by all Agent Economy modules. No state, no logic.
///         Agent IDs mirror the live SomniacAgentRouterV2 deployment on Somnia Shannon.
library PlatformAdapter {
    address internal constant PLATFORM      = 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;
    uint256 internal constant LLM_AGENT_ID  = 12847293847561029384;
    uint256 internal constant WEB_AGENT_ID  = 12875401142070969085;
    uint256 internal constant JSON_AGENT_ID = 13174292974160097713;
}
