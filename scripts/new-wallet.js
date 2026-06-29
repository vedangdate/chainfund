// Generate a fresh throwaway deployer wallet for the Sepolia testnet.
// Print the address (fund this from a faucet) and the private key
// (paste into .env as DEPLOYER_PRIVATE_KEY). Testnet only — never reuse on mainnet.
const { ethers } = require("ethers");

const w = ethers.Wallet.createRandom();
console.log("Address:     ", w.address);
console.log("Private key: ", w.privateKey);
console.log("\nFund the address with Sepolia test-ETH, then put the key in .env:");
console.log("  DEPLOYER_PRIVATE_KEY=" + w.privateKey.slice(2));
