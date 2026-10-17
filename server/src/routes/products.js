const express = require("express");
const pool = require("../db/pool");
const { buildProductListQuery, MAX_PAGE_SIZE } = require("../lib/productQuery");

const router = express.Router();

// GET /api/products
// Public catalog listing: ?page, ?limit, ?sort, ?search, ?category, ?minPrice, ?maxPrice
// Prices are integer paisa (PKR), matching the products.price_cents column.
router.get("/", async (req, res) => {
  const query = buildProductListQuery(req.query);
  if (query.error) {
    return res.status(400).json({ error: query.error });
  }

  try {
    const [{ rows: items }, { rows: countRows }] = await Promise.all([
      pool.query(query.sql, query.params),
      pool.query(query.countSql, query.filterParams),
    ]);

    const total = countRows[0].total;
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    res.json({
      products: items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    });
  } catch (err) {
    console.error("products list failed:", err.message);
    res.status(500).json({ error: "Could not load products" });
  }
});

// GET /api/products/:slug
// Public product detail, addressed by slug so URLs stay clean.
router.get("/:slug", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.slug, p.brand, p.description, p.price_cents, p.currency,
              p.sizes, p.colors, p.stock, p.image_url, p.created_at,
              c.slug AS category_slug, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = $1 AND p.is_active = true
       LIMIT 1`,
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ product: rows[0] });
  } catch (err) {
    console.error("product detail failed:", err.message);
    res.status(500).json({ error: "Could not load product" });
  }
});

module.exports = router;
