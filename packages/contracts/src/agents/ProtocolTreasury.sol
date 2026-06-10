// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProtocolTreasury
/// @notice Single sink for every Agent Economy fee. Owner-only withdraw. Public balance.
contract ProtocolTreasury {
    address public owner;

    event Deposit(address indexed from, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);
    event OwnerChanged(address indexed previous, address indexed next);

    constructor(address initialOwner) {
        owner = initialOwner;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "not owner");
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "withdraw failed");
        emit Withdraw(owner, amount);
    }

    function setOwner(address next) external {
        require(msg.sender == owner, "not owner");
        emit OwnerChanged(owner, next);
        owner = next;
    }
}
