// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Roles is Ownable {
    // Define role structure
    enum Role { None, Admin, Moderator, User }

    // Mapping of addresses to their assigned roles
    mapping(address => Role) private _roles;

    // Events for role changes
    event RoleAssigned(address indexed account, Role role);
    event RoleRevoked(address indexed account, Role role);

    // Constructor - Set the contract deployer as the owner
    constructor() Ownable(msg.sender) {
        _roles[msg.sender] = Role.Admin; // The owner starts as an Admin
        emit RoleAssigned(msg.sender, Role.Admin);
    }

    // Modifier to check if the caller has a specific role
    modifier onlyRole(Role requiredRole) {
        require(_roles[msg.sender] == requiredRole, "Access Denied: Insufficient Role");
        _;
    }

    // Assign a role to an address (Only Owner can do this)
    function assignRole(address account, Role role) external onlyOwner {
        require(account != address(0), "Invalid address");
        _roles[account] = role;
        emit RoleAssigned(account, role);
    }

    // Revoke a role from an address (Only Owner can do this)
    function revokeRole(address account) external onlyOwner {
        require(_roles[account] != Role.None, "No role assigned");
        emit RoleRevoked(account, _roles[account]);
        _roles[account] = Role.None;
    }

    // Check a user's role
    function getRole(address account) external view returns (Role) {
        return _roles[account];
    }

    // Example function: Only Admins can execute
    function adminTask() external onlyRole(Role.Admin) {
        // Admin-specific logic here
    }

    // Example function: Only Moderators can execute
    function moderatorTask() external onlyRole(Role.Moderator) {
        // Moderator-specific logic here
    }
}
