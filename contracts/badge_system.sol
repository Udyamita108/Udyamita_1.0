
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BadgeSystem {
    struct Contributor {
        uint256 xp;
        uint16 level;
        string title;
    }

    mapping(address => Contributor) public contributors;

    event XPUpdated(address indexed contributor, uint256 newXP, uint16 newLevel, string newTitle);
    event RoleUpdated(address indexed contributor, string newRole);

    string[] public titles = [
        "Apprentice", "Aspiring", "Novice", "Enthusiastic", "Explorer",
        "Code Craftsman", "Skilled", "Proficient", "Champion", "Quality",
        "Expert", "Professional", "Innovative", "Veteran", "Rising",
        "Master", "Conqueror", "Top-tier", "Insightful", "Legendary", "Supreme"
    ];

    uint256 constant REVIEWER_XP = 15000;
    uint256 constant SUPREME_XP = 505000;

    function addXP(address _contributor, uint256 _xp) external {
        Contributor storage contributor = contributors[_contributor];

        uint256 newXP = contributor.xp + _xp;
        (uint16 newLevel, string memory newTitle) = calculateLevel(newXP);

        contributor.xp = newXP;
        contributor.level = newLevel;
        contributor.title = newTitle;

        emit XPUpdated(_contributor, newXP, newLevel, newTitle);

        if (newXP >= SUPREME_XP) {
            emit RoleUpdated(_contributor, "Supreme");
        } else if (newXP >= REVIEWER_XP) {
            emit RoleUpdated(_contributor, "Reviewer");
        }
    }

    function getContributor(address _contributor) external view returns (uint256, uint16, string memory) {
        Contributor storage contributor = contributors[_contributor];
        return (contributor.xp, contributor.level, contributor.title);
    }

    function calculateLevel(uint256 _xp) public view returns (uint16, string memory) {
        if (_xp >= SUPREME_XP) return (100, titles[20]); // ✅ Correctly returns a string

        uint16 level = uint16(_xp / 1000); 
        if (level >= titles.length) level = uint16(titles.length - 1);

        return (level, string(abi.encodePacked(titles[level]))); // ✅ Convert to memory string
    }
}
