const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { createOrderFromCart, orderView } = require("../lib/orderService");
const pool = require("../db/pool");

const router = express.Router();

// Orders are always the caller's own: every query filters on user_id.
router.use(requireAuth);

// POST /api/orders  { full_name, phone, address_line1, address_line2?, city,
//                      postal_code, payment_method: "cod" | "stripe" }
// Turns the caller's cart into an order in one transaction: order + items,
// stock decremented, cart cleared. Stripe orders start as pending payment.
router.post("/", async (req, res, next) => {
  try {
    const { order, items } = await createOrderFromCart(pool, req.user.id, req.body);
    const payment =
      order.payment_method === "stripe"
        ? { required: true, next_step: "POST /api/payments/stripe/intent with the order id" }
        : { required: false, note: "Cash on delivery: pay the courier when the order arrives" };
    res.status(201).json({ order: orderView(order, items), payment });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message, details: err.details });
    }
    next(err);
  }
});

// GET /api/orders -> the caller's own orders, newest first
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, status, total_cents, payment_method, created_at
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ orders: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id -> one of the caller's own orders with its items
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Order not found" });
    const { rows: items } = await pool.query(
      `SELECT id, product_id, product_name, size, unit_price_cents, quantity
       FROM order_items WHERE order_id = $1`,
      [rows[0].id]
    );
    res.json({ order: orderView(rows[0], items) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
