// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardSystem is Ownable {
    struct Contributor {
        uint256 xp;
        uint256 contributions;
        string title;
        uint256 level;
        string role;
    }

    IERC20 public rewardToken;
    mapping(address => Contributor) public contributors;

    constructor(address _rewardToken) Ownable(msg.sender) {
        rewardToken = IERC20(_rewardToken);
    }

    function contribute(address user, uint256 xpEarned) external onlyOwner {
        Contributor storage contributor = contributors[user];
        contributor.xp += xpEarned;
        contributor.contributions += 1;
    }

    function claimReward(address user, uint256 amount) external {
        require(rewardToken.balanceOf(address(this)) >= amount, "Insufficient reward balance");
        require(contributors[user].xp >= amount, "Not enough XP");

        contributors[user].xp -= amount;
        rewardToken.transfer(user, amount);
    }

    function getContributorDetails(address user) external view returns (uint256, uint256, string memory, uint256, string memory) {
        Contributor storage contributor = contributors[user];
        return (contributor.xp, contributor.contributions, contributor.title, contributor.level, contributor.role);
    }
}
