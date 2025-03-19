require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.20" },
      { version: "0.8.28" },
    ],
  },
  networks: {
    hardhat: {}, // Local Hardhat network
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL, // Fetching Sepolia RPC from .env
      accounts: [process.env.PRIVATE_KEY], // Fetching private key from .env
    },
  },
};


// require("@nomicfoundation/hardhat-toolbox");

// module.exports = {
//   solidity: "0.8.18",
//   paths: {
//     sources: "./contracts", // Default contract folder
//     cache: "./cache",
//     artifacts: "./artifacts",
//   },
// };
