
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ContributionToken is ERC20, Ownable(msg.sender) {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1 Million Tokens

    constructor() ERC20("ContributionToken", "CTKN") {
        _mint(msg.sender, INITIAL_SUPPLY); // Mint initial supply to contract owner
    }

    // Mint new tokens (only owner/admin)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Burn tokens (users can burn their own tokens)
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
