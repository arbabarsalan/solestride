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

module.exports = router;
