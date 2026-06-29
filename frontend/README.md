# ChainFund — Frontend

Decentralized crowdfunding dApp on Ethereum Sepolia.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Runs at `http://localhost:5173`.

## Build

```bash
npm run build
```

Output lands in `dist/`.

## Deploy contract

1. Deploy the Crowdfunding contract to Sepolia via the Hardhat scripts in the repo root.
2. Update `src/contract.json` with the deployed address (the build reads it at runtime — never hardcoded).

## Wallet

Uses MetaMask (or any injected browser wallet). Connects to **Sepolia testnet** (chainId 11155111).  
No real funds — testnet only.
