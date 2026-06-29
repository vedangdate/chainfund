const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const net = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${net}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${hre.ethers.formatEther(bal)} ETH`);

  const Factory = await hre.ethers.getContractFactory("Crowdfunding");
  const c = await Factory.deploy();
  await c.waitForDeployment();
  const address = await c.getAddress();
  console.log(`\n✅ Crowdfunding deployed at: ${address}`);

  // Export ABI + address so the frontend/backend can pick it up.
  const artifact = await hre.artifacts.readArtifact("Crowdfunding");
  const out = {
    address,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    network: net,
    abi: artifact.abi,
  };

  const targets = [
    path.join(__dirname, "..", "frontend", "src", "contract.json"),
    path.join(__dirname, "..", "backend", "contract.json"),
    path.join(__dirname, "..", "deployments", `${net}.json`),
  ];
  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, JSON.stringify(out, null, 2));
    console.log(`   wrote ${path.relative(path.join(__dirname, ".."), t)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
