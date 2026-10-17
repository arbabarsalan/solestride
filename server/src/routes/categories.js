const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

// GET /api/categories
// Public catalog nav: every category with how many active products it holds.
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.slug, c.description,
              COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
       GROUP BY c.id, c.name, c.slug, c.description
       ORDER BY c.name ASC`
    );
    res.json({ categories: rows });
  } catch (err) {
    console.error("categories list failed:", err.message);
    res.status(500).json({ error: "Could not load categories" });
  }
});

module.exports = router;
