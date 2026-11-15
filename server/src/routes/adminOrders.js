const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { orderView } = require("../lib/orderService");
const pool = require("../db/pool");

const router = express.Router();

// Admin-only order management.
router.use(requireAuth, requireAdmin);

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];

// GET /api/admin/orders -> every order, newest first, with a buyer summary
router.get("/orders", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { rows } = await pool.query(
      `SELECT o.id, o.user_id, o.status, o.total_cents, o.payment_method,
              o.shipping_address, o.created_at, o.updated_at,
              u.email AS customer_email, u.full_name AS customer_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS total FROM orders`);
    res.json({ orders: rows, total: countRows[0].total, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/:id -> one order with its items
router.get("/orders/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.*, u.email AS customer_email, u.full_name AS customer_name
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
      [req.params.id]
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

// PATCH /api/admin/orders/:id/status  { status }
// Moves an order through pending -> paid -> shipped -> delivered, or cancels it.
router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
    }
    const { rows } = await pool.query(
      `UPDATE orders SET status = $1, updated_at = now() WHERE id = $2
       RETURNING id, user_id, status, total_cents, payment_method, updated_at`,
      [status, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Order not found" });
    res.json({ order: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, STATUSES };
