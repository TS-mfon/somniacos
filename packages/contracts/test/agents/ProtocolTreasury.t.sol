// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/agents/ProtocolTreasury.sol";

contract ProtocolTreasuryTest is Test {
    ProtocolTreasury treasury;
    address owner = address(0xA1);
    address other = address(0xB2);

    function setUp() public {
        treasury = new ProtocolTreasury(owner);
    }

    function testReceivesEther() public {
        vm.deal(other, 5 ether);
        vm.prank(other);
        (bool ok, ) = address(treasury).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(treasury).balance, 1 ether);
    }

    function testOwnerCanWithdraw() public {
        vm.deal(address(treasury), 3 ether);
        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        treasury.withdraw(2 ether);
        assertEq(owner.balance, ownerBefore + 2 ether);
        assertEq(address(treasury).balance, 1 ether);
    }

    function testNonOwnerCannotWithdraw() public {
        vm.deal(address(treasury), 1 ether);
        vm.prank(other);
        vm.expectRevert("not owner");
        treasury.withdraw(1 ether);
    }

    function testOwnerCanTransferOwnership() public {
        vm.prank(owner);
        treasury.setOwner(other);
        assertEq(treasury.owner(), other);
    }

    function testNonOwnerCannotTransferOwnership() public {
        vm.prank(other);
        vm.expectRevert("not owner");
        treasury.setOwner(other);
    }
}
