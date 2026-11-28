// Unit tests for the admin product-management routes (list, create, edit,
// archive, photo upload guard). The pool is stubbed, so nothing here touches a
// real database; tokens are real JWTs signed with the test secret.
const { test } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test_secret";

const pool = require("../src/db/pool");
const realPoolQuery = pool.query;
const adminToken = jwt.sign({ id: 1, role: "admin" }, process.env.JWT_SECRET);
const customerToken = jwt.sign({ id: 2, role: "customer" }, process.env.JWT_SECRET);

function stubPool(handler) {
  pool.query = async (sql, params) => handler(sql.replace(/\s+/g, " ").trim(), params);
}

function unstub() {
  pool.query = realPoolQuery;
}

function buildApp() {
  const express = require("express");
  const router = require("../src/routes/admin");
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

const createdRow = {
  id: 21,
  category_id: 3,
  name: "Silk Kurta",
  slug: "silk-kurta",
  brand: "LIBAS",
  description: "A soft silk kurta.",
  price_cents: 250000,
  currency: "PKR",
  sizes: ["S", "M"],
  colors: ["Teal"],
  stock: 12,
  image_url: null,
  is_active: true,
  created_at: "2026-11-28T10:00:00.000Z",
  category_slug: "men",
  category_name: "Men",
};

test("admin product list needs a bearer token", async () => {
  const res = await call("GET", "/api/admin/products");
  assert.equal(res.status, 401);
});

test("a signed-in customer is not an admin", async () => {
  const res = await call("GET", "/api/admin/products", { token: customerToken });
  assert.equal(res.status, 403);
});

test("create product returns it with a generated slug", async () => {
  stubPool((sql) => {
    if (sql.startsWith("SELECT slug FROM products")) {
      return { rows: [{ slug: "silk-kurta-2" }] };
    }
    if (sql.startsWith("INSERT INTO products")) {
      return { rows: [{ id: 21 }] };
    }
    if (sql.startsWith("SELECT p.id, p.category_id")) {
      return { rows: [createdRow] };
    }
    throw new Error(`unexpected sql: ${sql}`);
  });
  try {
    const res = await call("POST", "/api/admin/products", {
      token: adminToken,
      body: {
        name: "Silk Kurta",
        brand: "LIBAS",
        description: "A soft silk kurta.",
        price_cents: 250000,
        stock: 12,
        category_id: 3,
        sizes: ["S", "M"],
        colors: ["Teal"],
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.product.slug, "silk-kurta");
    assert.equal(res.body.product.price_cents, 250000);
  } finally {
    unstub();
  }
});

test("create product without required fields is rejected", async () => {
  const res = await call("POST", "/api/admin/products", {
    token: adminToken,
    body: { name: "Only a name" },
  });
  assert.equal(res.status, 400);
});

test("edit product updates the fields that were sent", async () => {
  stubPool((sql) => {
    if (sql.startsWith("UPDATE products SET stock")) {
      return { rows: [{ id: 21 }] };
    }
    if (sql.startsWith("SELECT p.id, p.category_id")) {
      return { rows: [{ ...createdRow, stock: 4 }] };
    }
    throw new Error(`unexpected sql: ${sql}`);
  });
  try {
    const res = await call("PATCH", "/api/admin/products/21", {
      token: adminToken,
      body: { stock: 4 },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.product.stock, 4);
  } finally {
    unstub();
  }
});

test("edit a product that does not exist is a 404", async () => {
  stubPool((sql) => {
    if (sql.startsWith("UPDATE products SET stock")) return { rows: [] };
    throw new Error(`unexpected sql: ${sql}`);
  });
  try {
    const res = await call("PATCH", "/api/admin/products/999", {
      token: adminToken,
      body: { stock: 1 },
    });
    assert.equal(res.status, 404);
  } finally {
    unstub();
  }
});

test("restore works with is_active alone", async () => {
  stubPool((sql) => {
    if (sql.startsWith("UPDATE products SET is_active = $1")) {
      return { rows: [{ id: 21 }] };
    }
    if (sql.startsWith("SELECT p.id, p.category_id")) {
      return { rows: [{ ...createdRow, is_active: true }] };
    }
    throw new Error(`unexpected sql: ${sql}`);
  });
  try {
    const res = await call("PATCH", "/api/admin/products/21", {
      token: adminToken,
      body: { is_active: true },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.product.is_active, true);
  } finally {
    unstub();
  }
});

test("delete archives the product instead of removing it", async () => {
  stubPool((sql, params) => {
    if (sql.startsWith("UPDATE products SET is_active = false")) {
      assert.deepEqual(params, [21]);
      return { rows: [{ id: 21, slug: "silk-kurta", is_active: false }] };
    }
    throw new Error(`unexpected sql: ${sql}`);
  });
  try {
    const res = await call("DELETE", "/api/admin/products/21", { token: adminToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.archived, true);
    assert.equal(res.body.product.is_active, false);
  } finally {
    unstub();
  }
});

test("delete a product that does not exist is a 404", async () => {
  stubPool(() => ({ rows: [] }));
  try {
    const res = await call("DELETE", "/api/admin/products/999", { token: adminToken });
    assert.equal(res.status, 404);
  } finally {
    unstub();
  }
});

test("photo upload without a file is rejected", async () => {
  const res = await call("POST", "/api/admin/products/21/image", { token: adminToken });
  assert.equal(res.status, 400);
});
