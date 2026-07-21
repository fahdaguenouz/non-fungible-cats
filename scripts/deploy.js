import hre from "hardhat";

async function main() {
  const initialBasePrice = hre.ethers.parseEther("0.01"); // 0.01 ETH

  const nappingCats = await hre.ethers.deployContract("NappingCats", [initialBasePrice]);

  await nappingCats.waitForDeployment();

  console.log("NappingCats deployed to:", await nappingCats.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
