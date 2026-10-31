// Unit tests for the admin orders routes. The pool is stubbed so the whole
// suite runs without a database; tokens are real JWTs signed with the test
// secret, and the router is driven through an ephemeral port like the
// Stripe webhook tests.
const { test } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const { orderView } = require("../src/lib/orderService");

process.env.JWT_SECRET = "test_secret";

const pool = require("../src/db/pool");

const realPoolQuery = pool.query;
const adminToken = jwt.sign({ id: 1, role: "admin" }, process.env.JWT_SECRET);
const customerToken = jwt.sign({ id: 2, role: "customer" }, process.env.JWT_SECRET);

function stubPool(handler) {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
    return handler(sql, params);
  };
  return calls;
}

function unstub() {
  pool.query = realPoolQuery;
}

function buildApp() {
  const express = require("express");
  const { router } = require("../src/routes/adminOrders");
  const app = express();
  app.use(express.json());
  app.use("/api/admin", router);
  return app;
}

async function call(method, path, { token, body } = {}) {
  const app = buildApp();
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

const sampleOrder = {
  id: 9,
  user_id: 2,
  status: "pending",
  total_cents: 485000,
  payment_method: "cod",
  shipping_address: { full_name: "Ayesha K.", city: "Peshawar" },
  created_at: "2026-10-31T06:00:00.000Z",
  customer_email: "ayesha@example.com",
  customer_name: "Ayesha K.",
};
const sampleItems = [
  { id: 1, product_id: 4, product_name: "Lawn Kurta", size: "M", unit_price_cents: 235000, quantity: 2 },
];

test("admin orders list needs a bearer token", async () => {
  const res = await call("GET", "/api/admin/orders");
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Authentication required");
});

test("a garbage token is rejected as expired or invalid", async () => {
  const res = await call("GET", "/api/admin/orders", { token: "not-a-jwt" });
  assert.equal(res.status, 401);
  assert.equal(res.body.error, "Invalid or expired token");
});

test("a signed-in customer is not an admin", async () => {
  const res = await call("GET", "/api/admin/orders", { token: customerToken });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, "Admin access required");
});

test("an admin gets every order newest first with a total count", async () => {
  const calls = stubPool((sql) =>
    /SELECT COUNT/.test(sql) ? { rows: [{ total: 1 }] } : { rows: [sampleOrder] }
  );
  try {
    const res = await call("GET", "/api/admin/orders", { token: adminToken });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.orders, [sampleOrder]);
    assert.equal(res.body.total, 1);
    const listQuery = calls[0];
    assert.equal(listQuery.params[0], 50, "default limit");
    assert.equal(listQuery.params[1], 0, "default offset");
    assert.ok(/ORDER BY o\.created_at DESC/.test(listQuery.sql), "newest first");
    const countQuery = calls[1];
    assert.ok(/SELECT COUNT/.test(countQuery.sql), "total counted");
  } finally {
    unstub();
  }
});

test("limit and offset query params pass through clamped", async () => {
  const calls = stubPool((sql) =>
    /SELECT COUNT/.test(sql) ? { rows: [{ total: 0 }] } : { rows: [] }
  );
  try {
    await call("GET", "/api/admin/orders?limit=10&offset=5", { token: adminToken });
    assert.deepEqual(calls[0].params, [10, 5]);
  } finally {
    unstub();
  }
});

test("a limit over 100 is clamped and a negative offset floors at 0", async () => {
  const calls = stubPool((sql) =>
    /SELECT COUNT/.test(sql) ? { rows: [{ total: 0 }] } : { rows: [] }
  );
  try {
    await call("GET", "/api/admin/orders?limit=999&offset=-4", { token: adminToken });
    assert.deepEqual(calls[0].params, [100, 0]);
  } finally {
    unstub();
  }
});

test("an admin can read one order with its items", async () => {
  const calls = stubPool((sql) => {
    if (/FROM orders o JOIN users/.test(sql)) return { rows: [sampleOrder] };
    return { rows: sampleItems };
  });
  try {
    const res = await call("GET", "/api/admin/orders/9", { token: adminToken });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.order, orderView(sampleOrder, sampleItems));
    assert.equal(calls[1].params[0], 9, "items queried by order id");
  } finally {
    unstub();
  }
});

test("a missing order id answers 404", async () => {
  stubPool(() => ({ rows: [] }));
  try {
    const res = await call("GET", "/api/admin/orders/999", { token: adminToken });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Order not found");
  } finally {
    unstub();
  }
});

test("a status outside the list is refused with the valid options", async () => {
  const calls = stubPool(() => ({ rows: [] }));
  try {
    const res = await call("PATCH", "/api/admin/orders/9/status", {
      token: adminToken,
      body: { status: "frozen" },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes("pending, paid, shipped, delivered, cancelled"));
    assert.equal(calls.length, 0, "no write attempted");
  } finally {
    unstub();
  }
});

test("a valid status transition updates the order", async () => {
  const calls = stubPool(() => ({ rows: [{ ...sampleOrder, status: "shipped" }] }));
  try {
    const res = await call("PATCH", "/api/admin/orders/9/status", {
      token: adminToken,
      body: { status: "shipped" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.order.status, "shipped");
    assert.deepEqual(calls[0].params, ["shipped", "9"]);
  } finally {
    unstub();
  }
});

test("a status change on a missing order answers 404", async () => {
  stubPool(() => ({ rows: [] }));
  try {
    const res = await call("PATCH", "/api/admin/orders/999/status", {
      token: adminToken,
      body: { status: "delivered" },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "Order not found");
  } finally {
    unstub();
  }
});
