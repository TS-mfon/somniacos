// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library VerdictParserLib {
    function startsWithIgnoreCase(bytes memory value, bytes memory prefix) internal pure returns (bool) {
        if (value.length < prefix.length) return false;
        for (uint256 i; i < prefix.length; ++i) {
            bytes1 a = value[i];
            bytes1 b = prefix[i];
            if (a >= 0x61 && a <= 0x7a) a = bytes1(uint8(a) - 32);
            if (b >= 0x61 && b <= 0x7a) b = bytes1(uint8(b) - 32);
            if (a != b) return false;
        }
        return true;
    }

    function boundedInteger(bytes memory value, uint256 start, uint256 max) internal pure returns (uint256 parsed, bool ok) {
        bool found;
        for (uint256 i = start; i < value.length; ++i) {
            uint8 c = uint8(value[i]);
            if (c >= 48 && c <= 57) {
                found = true;
                parsed = parsed * 10 + c - 48;
                if (parsed > max) return (max, false);
            } else if (found) {
                break;
            }
        }
        return (parsed, found);
    }
}
