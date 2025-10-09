const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// Order schema/model
const OrderSchema = new mongoose.Schema(
  {
    userId: { type: String }, // optional; can be wired to auth later
    symbol: { type: String, required: true },
    name: { type: String },
    type: { type: String, enum: ["BUY", "SELL"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    // We keep both formatted and numeric if provided
    priceStr: { type: String },
    priceNum: { type: Number },
    timestamp: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);

// GET /api/orders - list recent orders (optionally filter by userId via query)
router.get("/orders", async (req, res) => {
  try {
    const { userId } = req.query;
    const q = userId ? { userId } : {};
    const items = await Order.find(q).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Failed to fetch orders" });
  }
});

// POST /api/orders - create a new order
router.post("/orders", async (req, res) => {
  try {
    const { userId, symbol, name, type, quantity, price, priceNum, timestamp } = req.body || {};
    if (!symbol || !type || !quantity) {
      return res.status(400).json({ error: "symbol, type, quantity are required" });
    }
    const doc = await Order.create({
      userId,
      symbol,
      name,
      type,
      quantity,
      priceStr: typeof price === "string" ? price : undefined,
      priceNum: typeof priceNum === "number" ? priceNum : undefined,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });
    res.json({ ok: true, order: doc });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Failed to create order" });
  }
});

// DELETE /api/orders/:id - remove an order by id (optional)
router.delete("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Order.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || "Failed to delete order" });
  }
});

module.exports = router;
