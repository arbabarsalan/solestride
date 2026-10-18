const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { quote } = require("../lib/cartPricing");
const pool = require("../db/pool");

const router = express.Router();
router.use(requireAuth);

// Address fields a Pakistani checkout needs. None may be blank.
const REQUIRED_ADDRESS = ["full_name", "phone", "address_line1", "city", "postal_code"];

function validateAddress(body) {
  const missing = REQUIRED_ADDRESS.filter((f) => !body[f] || !String(body[f]).trim());
  return missing;
}

// POST /api/checkout/quote
// Prices the caller's current cart against a delivery address: line totals,
// shipping (flat PKR 250, free over PKR 5,000) and the all-in total.
// Reads the cart, changes nothing.
router.post("/quote", async (req, res) => {
  const missing = validateAddress(req.body || {});
  if (missing.length > 0) {
    return res.status(400).json({ error: "Missing required address fields", missing });
  }

  const { rows } = await pool.query(
    `SELECT p.price_cents, ci.quantity
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1`,
    [req.user.id]
  );
  if (rows.length === 0) {
    return res.status(400).json({ error: "Your cart is empty" });
  }
  const items = rows.map((r) => ({ price_cents: r.price_cents, quantity: r.quantity }));
  res.json({ items_count: items.reduce((n, it) => n + it.quantity, 0), ...quote(items) });
});

module.exports = router;
