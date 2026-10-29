require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];
module.exports = {
  solidity: "0.8.24",
  networks: { sepolia: { url: process.env.SEPOLIA_RPC_URL || "", accounts } }
};
