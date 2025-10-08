const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Resolve repo root: routes/ -> backend/ -> FinSight/ -> DailyStockPredictor/
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const logsPath = path.join(repoRoot, "logs", "signals.csv");
const modelsDir = path.join(repoRoot, "models");

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

async function readSignals() {
  try {
    const text = await fs.promises.readFile(logsPath, "utf-8");
    return parseCsv(text);
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

// GET /api/tickers -> list unique tickers present in logs/signals.csv
router.get("/tickers", async (_req, res) => {
  try {
    const rows = await readSignals();
    const tickers = uniq(
      rows
        .map((r) => (r.Ticker || "").toUpperCase())
        .filter((t) => t && t !== "TICKER")
    ).sort();
    res.json({ count: tickers.length, tickers });
  } catch (e) {
    console.error("/tickers error", e);
    res.status(500).json({ error: "Failed to list tickers" });
  }
});

// GET /api/signals/:ticker -> last 60 rows for ticker
router.get("/signals/:ticker", async (req, res) => {
  try {
    const ticker = (req.params.ticker || "").toUpperCase();
    const rows = await readSignals();
    const filtered = rows.filter((r) => (r.Ticker || "").toUpperCase() === ticker);
    // Sort by Date asc, then slice last 60
    const sorted = filtered.sort((a, b) => (a.Date > b.Date ? 1 : a.Date < b.Date ? -1 : 0));
    const lastN = sorted.slice(Math.max(0, sorted.length - 60));
    res.json({ ticker, count: lastN.length, data: lastN });
  } catch (e) {
    console.error("/signals/:ticker error", e);
    res.status(500).json({ error: "Failed to read signals" });
  }
});

// GET /api/signals/:ticker/latest -> latest row for ticker
router.get("/signals/:ticker/latest", async (req, res) => {
  try {
    const ticker = (req.params.ticker || "").toUpperCase();
    const rows = await readSignals();
    const filtered = rows.filter((r) => (r.Ticker || "").toUpperCase() === ticker);
    if (filtered.length === 0) return res.json({ ticker, data: null });
    const latest = filtered.reduce((acc, r) => (acc && acc.Date > r.Date ? acc : r), null);
    res.json({ ticker, data: latest });
  } catch (e) {
    console.error("/signals/:ticker/latest error", e);
    res.status(500).json({ error: "Failed to read latest signal" });
  }
});

// GET /api/model-status/:ticker -> existence of model artifacts
router.get("/model-status/:ticker", async (req, res) => {
  try {
    const ticker = (req.params.ticker || "").toUpperCase();
    const transformerPath = path.join(modelsDir, `transformer_best_${ticker}.pt`);
    const scalerPath = path.join(modelsDir, `scaler_${ticker}.pkl`);
    const ppoPath = path.join(modelsDir, "ppo_saved_models", `ppo_agent_${ticker}.zip`);

    const exists = (p) => {
      try {
        fs.accessSync(p, fs.constants.F_OK);
        return true;
      } catch {
        return false;
      }
    };

    res.json({
      ticker,
      transformer: { path: transformerPath, exists: exists(transformerPath) },
      scaler: { path: scalerPath, exists: exists(scalerPath) },
      ppo: { path: ppoPath, exists: exists(ppoPath) },
    });
  } catch (e) {
    console.error("/model-status/:ticker error", e);
    res.status(500).json({ error: "Failed to read model status" });
  }
});

// GET /api/model-status -> status for all tickers discovered in signals.csv
router.get("/model-status", async (_req, res) => {
  try {
    const rows = await readSignals();
    const tickers = uniq(
      rows
        .map((r) => (r.Ticker || "").toUpperCase())
        .filter((t) => t && t !== "TICKER")
    ).sort();

    const exists = (p) => {
      try {
        fs.accessSync(p, fs.constants.F_OK);
        return true;
      } catch {
        return false;
      }
    };

    const data = tickers.map((ticker) => {
      const transformerPath = path.join(modelsDir, `transformer_best_${ticker}.pt`);
      const scalerPath = path.join(modelsDir, `scaler_${ticker}.pkl`);
      const ppoPath = path.join(modelsDir, "ppo_saved_models", `ppo_agent_${ticker}.zip`);
      return {
        ticker,
        transformer: { path: transformerPath, exists: exists(transformerPath) },
        scaler: { path: scalerPath, exists: exists(scalerPath) },
        ppo: { path: ppoPath, exists: exists(ppoPath) },
      };
    });

    res.json({ count: data.length, data });
  } catch (e) {
    console.error("/model-status error", e);
    res.status(500).json({ error: "Failed to read model status for all tickers" });
  }
});

module.exports = router;
