// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library TimeoutLib {
    function deadline(uint256 duration) internal view returns (uint64) {
        require(duration <= type(uint64).max - block.timestamp, "duration");
        return uint64(block.timestamp + duration);
    }
    function expired(uint64 at) internal view returns (bool) { return at != 0 && block.timestamp > at; }
}
