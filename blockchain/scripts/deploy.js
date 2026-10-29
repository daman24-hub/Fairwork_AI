const hre = require("hardhat");
async function main() {
  const Factory = await hre.ethers.getContractFactory("FairWorkEscrow");
  const escrow = await Factory.deploy();
  await escrow.waitForDeployment();
  console.log("FairWorkEscrow deployed at:", await escrow.getAddress());
  console.log("Network:", hre.network.name);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
