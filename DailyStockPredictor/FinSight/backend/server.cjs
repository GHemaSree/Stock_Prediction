const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth.cjs");
const predictionsRoutes = require("./routes/predictions.cjs");

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use("/api", authRoutes);
app.use("/api", predictionsRoutes);

// Connect to DB
    const mongoURI = 'mongodb+srv://praneethkallam:Kmit123$@cluster0.hyhjf2f.mongodb.net/sdc_project?retryWrites=true&w=majority&appName=Cluster0';
    mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
      .then(() => console.log('MongoDB connected to sdc_project'))
      .catch((err) => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
