# ChainFund

**Trustless crowdfunding on Ethereum.** Launch a campaign with a funding goal and
deadline, let anyone pledge ETH, and let the smart contract — not a middleman —
custody the funds. If the goal is met the creator withdraws; if it isn't, backers
pull their own refunds. No admin keys, no upgrade proxy, no custodial risk.

This is a compact, end-to-end Web3 reference project: a secure Solidity contract,
a React + wagmi frontend with wallet connect, and a Node indexer that turns
on-chain events into a queryable REST API.

> Live demo: _(Sepolia testnet — link added after deploy)_
> Contract on Etherscan: _(added after deploy)_

---

## What it demonstrates

| Layer | Tech | Highlights |
|-------|------|-----------|
| **Smart contract** | Solidity 0.8.24, Hardhat | custom errors, checks-effects-interactions, non-reentrant on every ETH path, pull-payment refunds, 17 passing unit tests |
| **Frontend** | React + Vite, wagmi v2 + viem | injected-wallet connect, chain-guard (Sepolia), create/pledge/unpledge/claim/refund flows, live tx status with Etherscan links |
| **Backend** | Node + Express + better-sqlite3 + ethers | event indexer → SQLite → paginated REST API (`/api/campaigns`) |

The frontend reads straight from the chain, so the demo works even if the API is
offline. The indexer is included to show the full data path: **chain → indexer →
API → UI**.

---

## Architecture

```
                 ┌────────────────────┐
   MetaMask ───► │  React + wagmi UI   │ ──reads──┐
                 └────────────────────┘          │
                          │ writes (tx)           │
                          ▼                        ▼
                 ┌────────────────────┐   ┌─────────────────┐
                 │ Crowdfunding.sol   │   │  public RPC      │
                 │ (Sepolia testnet)  │◄──┤  (Sepolia)       │
                 └────────────────────┘   └─────────────────┘
                          │ events                ▲
                          ▼                        │ poll
                 ┌────────────────────┐            │
                 │ Node indexer + API │────────────┘
                 │ Express + SQLite   │──► GET /api/campaigns
                 └────────────────────┘
```

## Contract API

| Function | Who | Effect |
|----------|-----|--------|
| `createCampaign(goal, duration, title, description)` | anyone | opens a campaign (goal in wei, duration 1h–90d) |
| `pledge(id)` `payable` | anyone | back a campaign with ETH |
| `unpledge(id, amount)` | backer | withdraw your pledge while the campaign is live |
| `claim(id)` | creator | withdraw funds after a **successful** campaign |
| `refund(id)` | backer | reclaim your pledge after a **failed** campaign |
| `getCampaign(id)` / `statusOf(id)` / `pledgeOf(id, addr)` | view | reads for the UI |

Status: `0 = live`, `1 = succeeded`, `2 = failed`.

---

## Run it locally

### 1. Contracts + local chain
```bash
npm install
npm test                       # 17 passing
npx hardhat node               # terminal A: local chain
npm run deploy:local           # terminal B: deploy + export ABI/address
npm run seed:local             # optional: a few demo campaigns
```

### 2. Backend API
```bash
cd backend && npm install
RPC_URL=http://127.0.0.1:8545 npm start   # http://localhost:8787/api/campaigns
```

### 3. Frontend
```bash
cd frontend && npm install
npm run dev                    # http://localhost:5173
```
Point MetaMask at your local node (or Sepolia for the live version).

---

## Deploy to Sepolia testnet

```bash
npm run newwallet              # make a throwaway deployer wallet
#   fund the printed address from a Sepolia faucet
cp .env.example .env           # set SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY
npm run deploy:sepolia         # deploys + writes the address into frontend & backend
```

The deploy writes `frontend/src/contract.json` and `backend/contract.json`, so the
apps pick up the new address automatically. Rebuild the frontend to ship it.

---

## Security notes

- **No custody beyond the contract.** Funds live in the contract; only the success
  (`claim`) or failure (`refund`) paths can move them.
- **Reentrancy-safe.** Every external ETH transfer runs after state updates, behind
  a non-reentrant guard, using `call` with an explicit success check.
- **Pull over push.** Refunds are pulled by each backer — no loop that could be
  griefed or run out of gas.
- Testnet only. Not audited. Don't put real funds in it.

## License

MIT
