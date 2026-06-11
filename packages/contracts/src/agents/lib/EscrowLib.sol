// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library EscrowLib {
    uint256 internal constant BPS = 10_000;
    enum Status { Empty, Locked, Released, Refunded, Split }
    struct Slot { uint256 amount; Status status; }

    function lock(Slot storage self, uint256 amount) internal {
        require(self.status == Status.Empty && amount != 0, "invalid lock");
        self.amount = amount;
        self.status = Status.Locked;
    }
    function release(Slot storage self) internal returns (uint256 amount) { require(self.status == Status.Locked, "not locked"); self.status = Status.Released; return self.amount; }
    function refund(Slot storage self) internal returns (uint256 amount) { require(self.status == Status.Locked, "not locked"); self.status = Status.Refunded; return self.amount; }
    function split(Slot storage self, uint256 firstBps) internal returns (uint256 first, uint256 second) {
        require(self.status == Status.Locked && firstBps <= BPS, "invalid split");
        self.status = Status.Split;
        first = self.amount * firstBps / BPS;
        second = self.amount - first;
    }
}
