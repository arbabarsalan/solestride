// Unit tests for the Stripe webhook route. No network, no live Stripe calls:
// the Stripe client is the real SDK only for offline signature helpers
// (constructEvent / generateTestHeaderString), and the pool is stubbed so the
// paid transition can be asserted without a database.
const { test } = require("node:test");
const assert = require("node:assert");
const Stripe = require("stripe");

process.env.STRIPE_SECRET_KEY = "sk_test_placeholder_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

const stripe = require("../src/lib/stripe");
const pool = require("../src/db/pool");
const buildPaymentsApp = () => {
  const express = require("express");
  const router = require("../src/routes/payments");
  const app = express();
  app.use("/api/payments", router);
  return app;
};

// The route reads stripe.get() at request time, so patching the exported
// object is enough. Same for pool.query: the route already holds the module.
const realStripeGet = stripe.get;
const realPoolQuery = pool.query;
const realClient = new Stripe(process.env.STRIPE_SECRET_KEY);

function stubBackend({ paymentRows }) {
  const calls = [];
  stripe.get = () => realClient;
  pool.query = async (sql, params) => {
    calls.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
    if (/UPDATE payments SET status = 'succeeded'/.test(sql)) {
      return { rows: paymentRows };
    }
    return { rows: [] };
  };
  return calls;
}

function unstub() {
  stripe.get = realStripeGet;
  pool.query = realPoolQuery;
}

async function postWebhook(payload, signature) {
  const app = buildPaymentsApp();
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const headers = { "Content-Type": "application/json" };
    if (signature) headers["Stripe-Signature"] = signature;
    const res = await fetch(`http://127.0.0.1:${port}/api/payments/stripe/webhook`, {
      method: "POST",
      headers,
      body: payload,
    });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

function succeededEvent(intentId) {
  return {
    id: "evt_test_1",
    type: "payment_intent.succeeded",
    data: { object: { id: intentId, object: "payment_intent" } },
  };
}

test("a validly signed payment_intent.succeeded marks the payment and order paid", async () => {
  const calls = stubBackend({ paymentRows: [{ order_id: 7 }] });
  try {
    const payload = JSON.stringify(succeededEvent("pi_test_123"));
    const signature = await realClient.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    const res = await postWebhook(payload, signature);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { received: true });
    const paymentUpdate = calls.find((c) => c.sql.startsWith("UPDATE payments"));
    assert.ok(paymentUpdate, "payments update ran");
    assert.equal(paymentUpdate.params[0], "pi_test_123");
    const orderUpdate = calls.find((c) => c.sql.startsWith("UPDATE orders"));
    assert.ok(orderUpdate, "orders update ran");
    assert.equal(orderUpdate.params[0], 7);
    assert.ok(/status = 'paid'/.test(orderUpdate.sql), "order moves to paid");
  } finally {
    unstub();
  }
});

test("a tampered or unsigned webhook is rejected with 400", async () => {
  stubBackend({ paymentRows: [] });
  try {
    const payload = JSON.stringify(succeededEvent("pi_test_456"));
    const res = await postWebhook(payload, "t=1,v1=deadbeef");
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes("Webhook signature verification failed"));
  } finally {
    unstub();
  }
});

test("a signed succeeded intent with no matching payment row touches no order", async () => {
  const calls = stubBackend({ paymentRows: [] });
  try {
    const payload = JSON.stringify(succeededEvent("pi_test_unknown"));
    const signature = await realClient.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    const res = await postWebhook(payload, signature);
    assert.equal(res.status, 200);
    assert.ok(calls.some((c) => c.sql.startsWith("UPDATE payments")));
    assert.equal(calls.find((c) => c.sql.startsWith("UPDATE orders")), undefined);
  } finally {
    unstub();
  }
});

test("payment_intent.payment_failed marks the payment failed", async () => {
  const calls = stubBackend({ paymentRows: [] });
  try {
    const payload = JSON.stringify({
      id: "evt_test_2",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_test_fail", object: "payment_intent" } },
    });
    const signature = await realClient.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    const res = await postWebhook(payload, signature);
    assert.equal(res.status, 200);
    const paymentUpdate = calls.find((c) => c.sql.startsWith("UPDATE payments"));
    assert.ok(paymentUpdate, "payments update ran");
    assert.ok(/status = 'failed'/.test(paymentUpdate.sql), "payment moves to failed");
    assert.equal(paymentUpdate.params[0], "pi_test_fail");
  } finally {
    unstub();
  }
});

test("an unrelated signed event type is accepted without writes", async () => {
  const calls = stubBackend({ paymentRows: [] });
  try {
    const payload = JSON.stringify({
      id: "evt_test_3",
      type: "charge.refunded",
      data: { object: { id: "ch_test", object: "charge" } },
    });
    const signature = await realClient.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    const res = await postWebhook(payload, signature);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { received: true });
    assert.equal(calls.length, 0);
  } finally {
    unstub();
  }
});
