const express = require("express");
const { requireAuth } = require("../middleware/auth");
const pool = require("../db/pool");

const router = express.Router();

// Every cart route belongs to the signed-in user: ownership is enforced by
// user_id in every query, never by trusting an id from the client.
router.use(requireAuth);

const MAX_QTY = 10;

// GET /api/cart -> the caller's cart with product details and totals
router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ci.id, ci.product_id, ci.size, ci.quantity,
            p.name, p.slug, p.brand, p.price_cents, p.image_url, p.sizes
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
     ORDER BY ci.added_at DESC`,
    [req.user.id]
  );
  const items = rows.map((r) => ({
    id: r.id,
    product: {
      id: r.product_id,
      name: r.name,
      slug: r.slug,
      brand: r.brand,
      price_cents: r.price_cents,
      image_url: r.image_url,
      sizes: r.sizes,
    },
    size: r.size,
    quantity: r.quantity,
    line_total_cents: r.price_cents * r.quantity,
  }));
  const itemsSubtotal = items.reduce((sum, it) => sum + it.line_total_cents, 0);
  const { shippingCents } = require("../lib/cartPricing");
  const shipping = shippingCents(itemsSubtotal);
  res.json({ items, items_subtotal_cents: itemsSubtotal, shipping_cents: shipping, total_cents: itemsSubtotal + shipping });
});

// POST /api/cart/items  { product_id, size, quantity? }
// Adds a line, or bumps the quantity when the same product+size is already there.
router.post("/items", async (req, res) => {
  const { product_id, size, quantity = 1 } = req.body || {};
  if (!Number.isInteger(product_id) || product_id <= 0) {
    return res.status(400).json({ error: "A valid product_id is required" });
  }
  if (typeof size !== "string" || !size.trim()) {
    return res.status(400).json({ error: "A size is required" });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
    return res.status(400).json({ error: `quantity must be between 1 and ${MAX_QTY}` });
  }

  const { rows: products } = await pool.query(
    `SELECT id, sizes, is_active FROM products WHERE id = $1 AND is_active = true`,
    [product_id]
  );
  if (products.length === 0) {
    return res.status(404).json({ error: "Could not find that product" });
  }
  const availableSizes = products[0].sizes || [];
  if (!availableSizes.includes(size)) {
    return res.status(400).json({ error: "That size is not available for this product", available_sizes: availableSizes });
  }

  const { rows } = await pool.query(
    `INSERT INTO cart_items (user_id, product_id, size, quantity)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, product_id, size)
     DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, $5)
     RETURNING id, product_id, size, quantity`,
    [req.user.id, product_id, size, quantity, MAX_QTY]
  );
  res.status(201).json({ item: rows[0] });
});

// PATCH /api/cart/items/:id  { quantity }  (quantity 0 removes the line)
router.patch("/items/:id", async (req, res) => {
  const { quantity } = req.body || {};
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QTY) {
    return res.status(400).json({ error: `quantity must be between 0 and ${MAX_QTY}` });
  }
  if (quantity === 0) {
    const { rowCount } = await pool.query(
      `DELETE FROM cart_items WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Cart item not found" });
    return res.json({ removed: true });
  }
  const { rows } = await pool.query(
    `UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3
     RETURNING id, product_id, size, quantity`,
    [quantity, req.params.id, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Cart item not found" });
  res.json({ item: rows[0] });
});

// DELETE /api/cart/items/:id
router.delete("/items/:id", async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM cart_items WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: "Cart item not found" });
  res.json({ removed: true });
});

module.exports = router;
