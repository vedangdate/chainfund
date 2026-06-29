/**
 * ChainFund indexer + REST API.
 *
 * Polls the Crowdfunding contract's events from an RPC endpoint, persists a
 * denormalized view into SQLite, and serves it over a small REST API. The
 * frontend can read straight from the chain, but this service shows the
 * fullstack pattern: chain -> indexer -> queryable API with pagination.
 */
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const { ethers } = require("ethers");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const PORT = process.env.PORT || 8787;
const RPC_URL = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const POLL_MS = Number(process.env.POLL_MS || 15000);

// ---- load deployed contract (address + abi) -------------------------------
const contractPath = path.join(__dirname, "contract.json");
if (!fs.existsSync(contractPath)) {
  console.error("Missing backend/contract.json — deploy the contract first (npm run deploy:*).");
  process.exit(1);
}
const deployment = JSON.parse(fs.readFileSync(contractPath, "utf8"));

// ---- db --------------------------------------------------------------------
const db = new Database(path.join(__dirname, "chainfund.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY,
    creator TEXT NOT NULL,
    goal TEXT NOT NULL,
    pledged TEXT NOT NULL DEFAULT '0',
    deadline INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    claimed INTEGER NOT NULL DEFAULT 0,
    created_block INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS pledges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    backer TEXT NOT NULL,
    amount TEXT NOT NULL,
    kind TEXT NOT NULL,           -- 'pledge' | 'unpledge' | 'refund' | 'claim'
    block INTEGER NOT NULL,
    tx TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
`);

const getMeta = (k, d) => {
  const r = db.prepare("SELECT v FROM meta WHERE k = ?").get(k);
  return r ? r.v : d;
};
const setMeta = (k, v) => db.prepare("INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(k, String(v));

const upsertCampaign = db.prepare(`
  INSERT INTO campaigns (id, creator, goal, pledged, deadline, title, description, claimed, created_block)
  VALUES (@id, @creator, @goal, @pledged, @deadline, @title, @description, @claimed, @created_block)
  ON CONFLICT(id) DO UPDATE SET
    pledged=excluded.pledged, claimed=excluded.claimed
`);
const setPledged = db.prepare("UPDATE campaigns SET pledged=? WHERE id=?");
const setClaimed = db.prepare("UPDATE campaigns SET claimed=1 WHERE id=?");
const insPledge = db.prepare("INSERT INTO pledges (campaign_id, backer, amount, kind, block, tx) VALUES (?,?,?,?,?,?)");

// ---- chain -----------------------------------------------------------------
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(deployment.address, deployment.abi, provider);

async function sync() {
  try {
    const latest = await provider.getBlockNumber();
    let from = Number(getMeta("lastBlock", deployment.fromBlock || 0));
    if (from === 0) from = Math.max(0, latest - 50000); // bootstrap window
    if (from > latest) return;

    const CHUNK = 5000;
    for (let start = from; start <= latest; start += CHUNK) {
      const end = Math.min(start + CHUNK - 1, latest);
      const events = await contract.queryFilter("*", start, end);
      for (const ev of events) {
        handleEvent(ev);
      }
      setMeta("lastBlock", end + 1);
    }
  } catch (e) {
    console.error("sync error:", e.shortMessage || e.message);
  }
}

function handleEvent(ev) {
  const name = ev.fragment?.name;
  const a = ev.args || [];
  if (name === "CampaignCreated") {
    const id = Number(a.id);
    // fetch full struct for title/description (events omit description to save gas)
    fetchAndStoreCampaign(id, Number(ev.blockNumber));
  } else if (name === "Pledged" || name === "Unpledged") {
    const id = Number(a.id);
    setPledged.run(a.totalPledged.toString(), id);
    insPledge.run(id, a.backer, a.amount.toString(), name === "Pledged" ? "pledge" : "unpledge", ev.blockNumber, ev.transactionHash);
  } else if (name === "Claimed") {
    const id = Number(a.id);
    setClaimed.run(id);
    insPledge.run(id, a.creator, a.amount.toString(), "claim", ev.blockNumber, ev.transactionHash);
  } else if (name === "Refunded") {
    const id = Number(a.id);
    insPledge.run(id, a.backer, a.amount.toString(), "refund", ev.blockNumber, ev.transactionHash);
  }
}

async function fetchAndStoreCampaign(id, block) {
  try {
    const c = await contract.getCampaign(id);
    upsertCampaign.run({
      id,
      creator: c.creator,
      goal: c.goal.toString(),
      pledged: c.pledged.toString(),
      deadline: Number(c.deadline),
      title: c.title,
      description: c.description,
      claimed: c.claimed ? 1 : 0,
      created_block: block,
    });
  } catch (e) {
    console.error("fetchCampaign error:", id, e.shortMessage || e.message);
  }
}

// ---- api -------------------------------------------------------------------
const app = express();
app.use(cors());

const shape = (row) => {
  const now = Math.floor(Date.now() / 1000);
  let status = "live";
  if (now >= row.deadline) status = BigInt(row.pledged) >= BigInt(row.goal) ? "succeeded" : "failed";
  return {
    id: row.id,
    creator: row.creator,
    title: row.title,
    description: row.description,
    goal: row.goal,
    pledged: row.pledged,
    deadline: row.deadline,
    claimed: !!row.claimed,
    status,
  };
};

app.get("/health", (_req, res) => res.json({ ok: true, address: deployment.address, chainId: deployment.chainId }));

app.get("/api/campaigns", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const rows = db.prepare("SELECT * FROM campaigns ORDER BY id DESC LIMIT ? OFFSET ?").all(limit, offset);
  res.json({ count: rows.length, campaigns: rows.map(shape) });
});

app.get("/api/campaigns/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "not found" });
  const pledges = db.prepare("SELECT backer, amount, kind, block, tx FROM pledges WHERE campaign_id = ? ORDER BY id DESC").all(row.id);
  res.json({ ...shape(row), activity: pledges });
});

app.listen(PORT, () => {
  console.log(`ChainFund API on :${PORT}  (contract ${deployment.address} @ chain ${deployment.chainId})`);
  sync();
  setInterval(sync, POLL_MS);
});
