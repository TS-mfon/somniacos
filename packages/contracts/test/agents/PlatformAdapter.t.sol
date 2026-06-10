// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../src/agents/PlatformAdapter.sol";

contract PlatformAdapterTest {
    function testCallbackSelectorMatchesSignature() public pure {
        bytes4 expected = bytes4(keccak256(
            "handleAgentResponse(uint256,(address,bytes,uint8,uint256,uint256,uint256)[],uint8,bytes)"
        ));
        require(PlatformAdapter.CALLBACK_SELECTOR == expected, "selector drift");
    }

    function testConstantsAreSet() public pure {
        require(PlatformAdapter.PLATFORM == 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776, "platform addr");
        require(PlatformAdapter.LLM_AGENT_ID == 12847293847561029384, "llm id");
        require(PlatformAdapter.WEB_AGENT_ID == 12875401142070969085, "web id");
        require(PlatformAdapter.JSON_AGENT_ID == 13174292974160097713, "json id");
    }
}
