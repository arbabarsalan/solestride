const express = require("express");
const stripe = require("../lib/stripe");
const { requireAuth } = require("../middleware/auth");
const pool = require("../db/pool");

const router = express.Router();

// POST /api/payments/stripe/intent  { order_id }
// Creates a TEST-mode PaymentIntent for one of the caller's own stripe
// orders and records the pending payment row. Never touches real money.
router.post("/stripe/intent", requireAuth, async (req, res, next) => {
  try {
    const client = stripe.get();
    if (!client) {
      return res.status(503).json({ error: "Stripe is not configured on this environment" });
    }
    const orderId = Number.parseInt(req.body?.order_id, 10);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "A valid order_id is required" });
    }
    const { rows } = await pool.query(
      `SELECT id, total_cents, payment_method, status FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Order not found" });
    const order = rows[0];
    if (order.payment_method !== "stripe") {
      return res.status(400).json({ error: "This order is not a Stripe order" });
    }
    if (order.status !== "pending") {
      return res.status(409).json({ error: `This order is already ${order.status}` });
    }
    const intent = await client.paymentIntents.create({
      amount: order.total_cents,
      currency: "pkr",
      metadata: { order_id: String(order.id) },
      automatic_payment_methods: { enabled: true },
    });
    await pool.query(
      `INSERT INTO payments (order_id, provider, provider_payment_id, amount_cents, status)
       VALUES ($1, 'stripe', $2, $3, 'pending')`,
      [order.id, intent.id, order.total_cents]
    );
    res.status(201).json({
      payment: {
        order_id: order.id,
        amount_cents: order.total_cents,
        currency: "pkr",
        payment_intent_id: intent.id,
        client_secret: intent.client_secret,
        mode: "test",
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/stripe/webhook
// Stripe calls this; the raw body and signature must match, so the body is
// parsed raw here and verified before anything is trusted.
router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers["stripe-signature"];
    const client = stripe.get();
    if (!client || !secret) {
      return res.status(503).json({ error: "Stripe is not configured on this environment" });
    }
    let event;
    try {
      event = client.webhooks.constructEvent(req.body, signature, secret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }
    try {
      if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object;
        const { rows } = await pool.query(
          `UPDATE payments SET status = 'succeeded' WHERE provider_payment_id = $1 RETURNING order_id`,
          [intent.id]
        );
        if (rows.length > 0) {
          await pool.query(
            `UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1 AND status = 'pending'`,
            [rows[0].order_id]
          );
        }
      } else if (event.type === "payment_intent.payment_failed") {
        const intent = event.data.object;
        await pool.query(
          `UPDATE payments SET status = 'failed' WHERE provider_payment_id = $1`,
          [intent.id]
        );
      }
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
