import hre from "hardhat";
import fs from "fs";

async function main() {
  const initialBasePrice = hre.ethers.parseEther("0.01"); // 0.01 ETH

  const nappingCats = await hre.ethers.deployContract("NappingCats", [
    initialBasePrice,
  ]);

  await nappingCats.waitForDeployment();
  const address = await nappingCats.getAddress();

  console.log("NappingCats deployed to:", address);

  // Update frontend/app.js
  const appJsPath = "./frontend/app.js";
  if (fs.existsSync(appJsPath)) {
    let appJsContent = fs.readFileSync(appJsPath, "utf8");
    appJsContent = appJsContent.replace(
      /const CONTRACT_ADDRESS = "0x[a-fA-F0-9]{40}";/,
      `const CONTRACT_ADDRESS = "${address}";`
    );
    fs.writeFileSync(appJsPath, appJsContent, "utf8");
    console.log("Updated contract address in frontend/app.js");
  }

  // Update server/index.js default address
  const serverJsPath = "./server/index.js";
  if (fs.existsSync(serverJsPath)) {
    let serverJsContent = fs.readFileSync(serverJsPath, "utf8");
    serverJsContent = serverJsContent.replace(
      /const CONTRACT_ADDRESS = process\.argv\[2\] \|\| "0x[a-fA-F0-9]{40}";/,
      `const CONTRACT_ADDRESS = process.argv[2] || "${address}";`
    );
    fs.writeFileSync(serverJsPath, serverJsContent, "utf8");
    console.log("Updated contract address in server/index.js");
  }

  console.log(
    `Server command:\n
      node server/index.js ${address}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
