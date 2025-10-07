const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Resolve path to logs/signals.csv at project root
const SIGNALS_CSV = path.resolve(__dirname, "..", "..", "..", "logs", "signals.csv");

function parseCsvSimple(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length !== headers.length) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] != null ? cols[idx].trim() : "";
    });
    rows.push(obj);
  }
  return rows;
}

router.get("/predictions/latest", async (req, res) => {
  try {
    if (!fs.existsSync(SIGNALS_CSV)) {
      return res.status(404).json({ error: "signals.csv not found", path: SIGNALS_CSV });
    }
    const raw = fs.readFileSync(SIGNALS_CSV, "utf8");
    const rows = parseCsvSimple(raw);
    if (!rows.length) return res.json({ date: null, items: [] });

    // Find latest date
    const dates = rows.map((r) => r.Date).filter(Boolean);
    const latest = dates.sort().slice(-1)[0];
    const latestRows = rows.filter((r) => r.Date === latest);

    // Normalize output
    const items = latestRows.map((r) => {
      const price = r.Price !== undefined && r.Price !== "" ? Number(r.Price) : null;
      const changePct = r.ChangePct !== undefined && r.ChangePct !== "" ? Number(r.ChangePct) : null;
      const volume = r.Volume !== undefined && r.Volume !== "" ? Number(r.Volume) : null;
      const volNorm = r.Vol_norm !== undefined && r.Vol_norm !== "" ? Number(r.Vol_norm) : null;
      let changeFmt = null;
      if (changePct !== null && !Number.isNaN(changePct)) {
        const sign = changePct >= 0 ? "+" : "";
        changeFmt = `${sign}${changePct.toFixed(2)}%`;
      }
      return {
        date: r.Date,
        ticker: r.Ticker,
        probUp: r.ProbUp != null ? Number(r.ProbUp) : null,
        action: r.Action != null ? Number(r.Action) : null,
        signal: r.Signal || null,
        price,
        changePct,
        changeFmt,
        volume,
        volNorm,
      };
    });

    return res.json({ date: latest, items });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

module.exports = router;
