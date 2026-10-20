// Unit tests for the pure cart pricing math (no database needed).
const test = require("node:test");
const assert = require("node:assert");
const { subtotal, shippingCents, quote, SHIPPING_FLAT, FREE_SHIPPING_THRESHOLD } = require("../src/lib/cartPricing");

test("subtotal multiplies price by quantity", () => {
  assert.equal(subtotal([{ price_cents: 89000, quantity: 2 }, { price_cents: 12000, quantity: 3 }]), 214000);
});

test("subtotal of an empty cart is 0", () => {
  assert.equal(subtotal([]), 0);
});

test("shipping is 0 on an empty cart", () => {
  assert.equal(shippingCents(0), 0);
});

test("shipping is flat PKR 250 under the threshold", () => {
  assert.equal(shippingCents(FREE_SHIPPING_THRESHOLD - 1), SHIPPING_FLAT);
});

test("shipping is free at the threshold", () => {
  assert.equal(shippingCents(FREE_SHIPPING_THRESHOLD), 0);
});

test("quote adds subtotal and shipping", () => {
  const q = quote([{ price_cents: 100000, quantity: 2 }]);
  assert.equal(q.items_subtotal_cents, 200000);
  assert.equal(q.shipping_cents, SHIPPING_FLAT);
  assert.equal(q.total_cents, 200000 + SHIPPING_FLAT);
  assert.equal(q.free_shipping, false);
});

test("quote marks free shipping above the threshold", () => {
  const q = quote([{ price_cents: 250000, quantity: 2 }]);
  assert.equal(q.shipping_cents, 0);
  assert.equal(q.total_cents, 500000);
  assert.equal(q.free_shipping, true);
});

test("quote handles a single item under the threshold", () => {
  const q = quote([{ price_cents: 5000, quantity: 1 }]);
  assert.equal(q.items_subtotal_cents, 5000);
  assert.equal(q.shipping_cents, SHIPPING_FLAT);
});

// Edge cases

test("subtotal ignores zero-quantity rows", () => {
  assert.equal(subtotal([{ price_cents: 50000, quantity: 0 }, { price_cents: 10000, quantity: 2 }]), 20000);
});

test("quote on an empty cart has no free-shipping flag", () => {
  const q = quote([]);
  assert.equal(q.items_subtotal_cents, 0);
  assert.equal(q.shipping_cents, 0);
  assert.equal(q.total_cents, 0);
  assert.equal(q.free_shipping, false);
});

test("quote at exactly one paisa above the threshold is free", () => {
  const q = quote([{ price_cents: FREE_SHIPPING_THRESHOLD + 1, quantity: 1 }]);
  assert.equal(q.shipping_cents, 0);
  assert.equal(q.free_shipping, true);
});

test("subtotal stays integer paisa, no floats", () => {
  const s = subtotal([{ price_cents: 3, quantity: 3 }]);
  assert.equal(s, 9);
  assert.ok(Number.isInteger(s));
});
