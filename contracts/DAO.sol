// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DAO is Ownable {
    IERC20 public governanceToken;
    
    struct Proposal {
        uint256 id;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        mapping(address => bool) voted;
    }

    uint256 public proposalCount;
    uint256 public votingDuration = 3 days; // Voting period
    mapping(uint256 => Proposal) private proposals; // Private to prevent direct iteration

    event ProposalCreated(uint256 id, string description, uint256 deadline);
    event Voted(uint256 proposalId, address voter, bool support);
    event ProposalExecuted(uint256 proposalId, bool passed);

    modifier onlyTokenHolders() {
        require(governanceToken.balanceOf(msg.sender) > 0, "Not a token holder");
        _;
    }

    constructor(address _tokenAddress) Ownable(msg.sender) {
        governanceToken = IERC20(_tokenAddress);
    }

    function createProposal(string memory _description) external onlyTokenHolders {
        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.description = _description;
        newProposal.deadline = block.timestamp + votingDuration;
        
        emit ProposalCreated(proposalCount, _description, newProposal.deadline);
    }

    function vote(uint256 _proposalId, bool _support) external onlyTokenHolders {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp < proposal.deadline, "Voting period ended");
        require(!proposal.voted[msg.sender], "Already voted");

        uint256 voterPower = governanceToken.balanceOf(msg.sender);
        require(voterPower > 0, "No voting power");

        if (_support) {
            proposal.votesFor += voterPower;
        } else {
            proposal.votesAgainst += voterPower;
        }
        proposal.voted[msg.sender] = true;

        emit Voted(_proposalId, msg.sender, _support);
    }

    function executeProposal(uint256 _proposalId) external onlyOwner {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp >= proposal.deadline, "Voting still active");
        require(!proposal.executed, "Already executed");

        bool passed = proposal.votesFor > proposal.votesAgainst;
        proposal.executed = true;

        emit ProposalExecuted(_proposalId, passed);
    }

    function getProposal(uint256 _proposalId) external view returns (
        uint256 id,
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 deadline,
        bool executed
    ) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.description,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.deadline,
            proposal.executed
        );
    }
}
