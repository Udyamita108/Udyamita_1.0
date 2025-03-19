// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Contribution is Ownable {
    
    enum ContributionType { CODE, ISSUE_RESOLUTION, REVIEW }

    struct ContributionRecord {
        uint256 id;
        address contributor;
        ContributionType contributionType;
        uint256 projectId;
        uint256 xpAwarded;
        uint256 timestamp;
    }

    uint256 private contributionCounter = 0;  // Instead of Counters.Counter
    mapping(uint256 => ContributionRecord) public contributions;
    mapping(address => uint256) public userXP;

    event ContributionLogged(
        uint256 indexed id,
        address indexed contributor,
        ContributionType contributionType,
        uint256 projectId,
        uint256 xpAwarded,
        uint256 timestamp
    );

    uint256 public constant CODE_XP = 50;
    uint256 public constant ISSUE_RESOLUTION_XP = 50;
    uint256 public constant REVIEW_XP = 70;

    constructor() Ownable(msg.sender) {}

    function logContribution(address _contributor, uint256 _projectId, ContributionType _type) external onlyOwner {
        contributionCounter += 1; // Manually incrementing instead of using Counters.increment()

        uint256 xp = _calculateXP(_type);
        userXP[_contributor] += xp;

        contributions[contributionCounter] = ContributionRecord({
            id: contributionCounter,
            contributor: _contributor,
            contributionType: _type,
            projectId: _projectId,
            xpAwarded: xp,
            timestamp: block.timestamp
        });

        emit ContributionLogged(contributionCounter, _contributor, _type, _projectId, xp, block.timestamp);
    }

    function _calculateXP(ContributionType _type) internal pure returns (uint256) {
        if (_type == ContributionType.CODE) {
            return CODE_XP;
        } else if (_type == ContributionType.ISSUE_RESOLUTION) {
            return ISSUE_RESOLUTION_XP;
        } else if (_type == ContributionType.REVIEW) {
            return REVIEW_XP;
        }
        return 0;
    }

    function getUserXP(address _user) external view returns (uint256) {
        return userXP[_user];
    }

    function getContributionDetails(uint256 _id) external view returns (ContributionRecord memory) {
        return contributions[_id];
    }
}
