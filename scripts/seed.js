// Seed a few demo campaigns + pledges against a running node (local or testnet).
// Useful so the live demo isn't empty on first load.
const hre = require("hardhat");

async function main() {
  const dep = require("../deployments/" + hre.network.name + ".json");
  const c = await hre.ethers.getContractAt("Crowdfunding", dep.address);
  const signers = await hre.ethers.getSigners();
  const me = signers[0];
  const eth = (n) => hre.ethers.parseEther(n);

  const samples = [
    ["Open-source ephemeris library", "Fund a permissively-licensed astronomy/ephemeris lib for indie devs.", eth("1"), 7 * 24 * 3600],
    ["Community node infrastructure", "Run public RPC nodes so small dApps don't depend on a single provider.", eth("3"), 14 * 24 * 3600],
    ["Translate docs to 10 languages", "Localize developer docs for the next million Web3 builders.", eth("0.5"), 5 * 24 * 3600],
  ];

  for (const [title, desc, goal, dur] of samples) {
    const tx = await c.createCampaign(goal, dur, title, desc);
    const r = await tx.wait();
    console.log(`created: ${title}`);
  }

  // A pledge or two so progress bars aren't at zero.
  await (await c.pledge(1, { value: eth("0.2") })).wait();
  await (await c.pledge(2, { value: eth("0.4") })).wait();
  console.log("seeded pledges");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
