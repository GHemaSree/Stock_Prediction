const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth.cjs");
const predictionsRoutes = require("./routes/predictions.cjs");
const signalsRoutes = require("./routes/signals.cjs");
const ordersRoutes = require("./routes/orders.cjs");

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use("/api", authRoutes);
app.use("/api", predictionsRoutes);
app.use("/api", signalsRoutes);
app.use("/api", ordersRoutes);

// Connect to DB
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("MONGO_URI is not set. Add it to FinSight/backend/.env");
  process.exit(1);
}
mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
