const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: "Full name is required" });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // Public registration always creates a customer. Admins are promoted in the database directly.
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'customer')
       RETURNING id, email, full_name, role, created_at`,
      [email.toLowerCase(), passwordHash, fullName.trim()]
    );

    const user = rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error("register failed:", err.message);
    res.status(500).json({ error: "Could not create account" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { rows } = await pool.query(
      "SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error("login failed:", err.message);
    res.status(500).json({ error: "Could not sign in" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, email, full_name, role, created_at FROM users WHERE id = $1",
    [req.user.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user: rows[0] });
});

module.exports = router;
