import { ethers } from "ethers";

// Update these addresses after deployment
const ROLES_CONTRACT = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONTRIBUTION_CONTRACT = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const TOKEN_CONTRACT = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const REWARD_CONTRACT = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const BADGE_CONTRACT = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const DAO_CONTRACT = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

// Import ABI files
import rolesABI from "artifacts\contracts\Roles.sol\Roles.json";
import contributionABI from "artifacts\contracts\contribution.sol\Contribution.json";
import tokenABI from "artifacts\contracts\tokens.sol\ContributionToken.json";
import rewardABI from "artifacts\contracts\reward_system.sol\RewardSystem.json";
import badgeABI from "artifacts\contracts\badge_system.sol\BadgeSystem.json";
import daoABI from "artifacts\contracts\DAO.sol\DAO.json";

export const getContract = (contractAddress, abi) => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return new ethers.Contract(contractAddress, abi, signer);
};

export const rolesContract = getContract(ROLES_CONTRACT, rolesABI);
export const contributionContract = getContract(CONTRIBUTION_CONTRACT, contributionABI);
export const tokenContract = getContract(TOKEN_CONTRACT, tokenABI);
export const rewardContract = getContract(REWARD_CONTRACT, rewardABI);
export const badgeContract = getContract(BADGE_CONTRACT, badgeABI);
export const daoContract = getContract(DAO_CONTRACT, daoABI);


