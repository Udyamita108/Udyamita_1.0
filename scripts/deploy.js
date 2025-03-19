const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Deploy Roles contract
  const Roles = await ethers.getContractFactory("Roles");
  const roles = await Roles.deploy();
  await roles.waitForDeployment();
  console.log(`Roles contract deployed at: ${await roles.getAddress()}`);

  // Deploy Contribution contract
  const Contribution = await ethers.getContractFactory("Contribution");
  const contribution = await Contribution.deploy();
  await contribution.waitForDeployment();
  console.log(`Contribution contract deployed at: ${await contribution.getAddress()}`);

  // Deploy Token contract
  const ContributionToken = await ethers.getContractFactory("ContributionToken");
  const token = await ContributionToken.deploy();
  await token.waitForDeployment();
  console.log(`Contribution Token deployed at: ${await token.getAddress()}`);

  // Deploy Reward System contract
  const RewardSystem = await ethers.getContractFactory("RewardSystem");
  const rewardSystem = await RewardSystem.deploy(await token.getAddress());
  await rewardSystem.waitForDeployment();
  console.log(`Reward System deployed at: ${await rewardSystem.getAddress()}`);

  // Deploy Badge System contract
  const BadgeSystem = await ethers.getContractFactory("BadgeSystem");
  const badgeSystem = await BadgeSystem.deploy();
  await badgeSystem.waitForDeployment();
  console.log(`Badge System deployed at: ${await badgeSystem.getAddress()}`);

  // Deploy DAO contract
  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(await token.getAddress());
  await dao.waitForDeployment();
  console.log(`DAO contract deployed at: ${await dao.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
