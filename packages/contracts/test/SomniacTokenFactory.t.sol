// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/SomniacTokenFactory.sol";

contract SomniacTokenFactoryTest {
    function testCreatesFixedSupplyToken() public {
        SomniacTokenFactory factory = new SomniacTokenFactory();
        address owner = address(0xBEEF);
        address tokenAddress = factory.createToken("Somnia Dog", "SDOG", 18, 1_000_000 ether, owner, "somniacos://token/sdog");
        SomniacFixedSupplyToken token = SomniacFixedSupplyToken(tokenAddress);

        require(keccak256(bytes(token.name())) == keccak256(bytes("Somnia Dog")), "name mismatch");
        require(keccak256(bytes(token.symbol())) == keccak256(bytes("SDOG")), "symbol mismatch");
        require(token.decimals() == 18, "decimals mismatch");
        require(token.totalSupply() == 1_000_000 ether, "supply mismatch");
        require(token.owner() == owner, "owner mismatch");
        require(token.balanceOf(owner) == 1_000_000 ether, "owner balance mismatch");
        require(factory.isSomniacToken(tokenAddress), "factory registry mismatch");
        require(factory.allTokensLength() == 1, "token count mismatch");
        require(factory.tokensByOwnerLength(owner) == 1, "owner token count mismatch");
    }

    function testRejectsInvalidTokenParams() public {
        SomniacTokenFactory factory = new SomniacTokenFactory();
        _expectRevertCreate(factory, "", "TOK", 18, 1 ether, address(this), "name required");
        _expectRevertCreate(factory, "Token", "", 18, 1 ether, address(this), "symbol required");
        _expectRevertCreate(factory, "Token", "TOK", 19, 1 ether, address(this), "decimals too high");
        _expectRevertCreate(factory, "Token", "TOK", 18, 0, address(this), "supply required");
        _expectRevertCreate(factory, "Token", "TOK", 18, 1 ether, address(0), "owner required");
    }

    function _expectRevertCreate(
        SomniacTokenFactory factory,
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply,
        address owner,
        string memory expected
    ) private {
        try factory.createToken(name, symbol, decimals, initialSupply, owner, "") {
            revert("expected revert");
        } catch Error(string memory reason) {
            require(keccak256(bytes(reason)) == keccak256(bytes(expected)), "wrong revert");
        }
    }
}
