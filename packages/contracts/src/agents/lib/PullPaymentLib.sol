// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library PullPaymentLib {
    struct Ledger {
        mapping(address => uint256) credits;
        uint256 totalCredits;
    }

    function credit(Ledger storage self, address account, uint256 amount) internal {
        if (amount == 0) return;
        self.credits[account] += amount;
        self.totalCredits += amount;
    }

    function withdraw(Ledger storage self, address account) internal returns (uint256 amount) {
        amount = self.credits[account];
        require(amount != 0, "no credit");
        self.credits[account] = 0;
        self.totalCredits -= amount;
    }
}
