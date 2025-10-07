const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  try {
  const { full_name, email, password, dob } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: "Email already exists" });
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ full_name, email, password: hashedPassword, dob });
  await user.save();
  res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: "1d" });
    res.json({
      token,
      user: {
        full_name: user.full_name,
        email: user.email,
        dob: user.dob,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Protected Profile Route
router.get("/profile", auth, async (req, res) => {
  try {
  const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
