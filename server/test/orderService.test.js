const { test } = require("node:test");
const assert = require("node:assert");
const { validateOrderInput, buildShippingAddress, PAYMENT_METHODS } = require("../src/lib/orderService");

test("an order needs every required address field", () => {
  const errors = validateOrderInput({ payment_method: "cod" });
  for (const field of ["full_name", "phone", "address_line1", "city", "postal_code"]) {
    assert.ok(errors.includes(`${field} is required`), `missing ${field} reported`);
  }
});

test("a complete COD order validates clean", () => {
  const body = {
    full_name: "Arbab Arsalan",
    phone: "03001234567",
    address_line1: "House 12, Street 4",
    city: "Peshawar",
    postal_code: "25000",
    payment_method: "cod",
  };
  assert.deepEqual(validateOrderInput(body), []);
});

test("payment_method must be cod or stripe", () => {
  const errors = validateOrderInput({
    full_name: "A", phone: "B", address_line1: "C", city: "D", postal_code: "E",
    payment_method: "bitcoin",
  });
  assert.ok(errors.some((e) => e.includes("payment_method")));
});

test("whitespace-only address fields count as missing", () => {
  const errors = validateOrderInput({
    full_name: "  ", phone: "B", address_line1: "C", city: "D", postal_code: "E",
    payment_method: "cod",
  });
  assert.ok(errors.includes("full_name is required"));
});

test("buildShippingAddress trims and keeps only known fields", () => {
  const addr = buildShippingAddress({
    full_name: " Arbab Arsalan ", phone: " 03001234567 ", address_line1: " House 12 ",
    address_line2: " University Road ", city: " Peshawar ", postal_code: " 25000 ",
  });
  assert.equal(addr.full_name, "Arbab Arsalan");
  assert.equal(addr.phone, "03001234567");
  assert.equal(addr.address_line2, "University Road");
  assert.equal(addr.city, "Peshawar");
  assert.equal(addr.postal_code, "25000");
  assert.deepEqual(Object.keys(addr).sort(), ["address_line1", "address_line2", "city", "full_name", "phone", "postal_code"]);
});

test("the two payment methods are cod and stripe", () => {
  assert.deepEqual(PAYMENT_METHODS, ["cod", "stripe"]);
});

// Edge cases for validation and address building


test("validateOrderInput flags every missing field at once", () => {
  const errors = validateOrderInput({});
  for (const field of ["full_name", "phone", "address_line1", "city", "postal_code"]) {
    assert.ok(errors.some((e) => e.startsWith(field)), `missing ${field} in ${errors}`);
  }
  assert.ok(errors.some((e) => e.startsWith("payment_method")));
});

test("validateOrderInput rejects whitespace-only fields", () => {
  const errors = validateOrderInput({
    full_name: "   ",
    phone: "  ",
    address_line1: " ",
    city: "  ",
    postal_code: " ",
    payment_method: "cod",
  });
  assert.equal(errors.length, 5);
});

test("validateOrderInput rejects unknown payment methods", () => {
  const errors = validateOrderInput({
    full_name: "Ali", phone: "0300", address_line1: "Street 1",
    city: "Peshawar", postal_code: "25000", payment_method: "bitcoin",
  });
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes("cod"));
});

test("validateOrderInput accepts a valid COD order", () => {
  const errors = validateOrderInput({
    full_name: "Ali", phone: "03001234567", address_line1: "Street 1",
    city: "Peshawar", postal_code: "25000", payment_method: "cod",
  });
  assert.deepEqual(errors, []);
});

test("buildShippingAddress trims and drops an empty line2", () => {
  const addr = buildShippingAddress({
    full_name: "  Ali Khan ", phone: " 0300 ", address_line1: " Street 1 ",
    address_line2: "   ", city: " Peshawar ", postal_code: " 25000 ",
  });
  assert.equal(addr.full_name, "Ali Khan");
  assert.equal(addr.phone, "0300");
  assert.equal(addr.address_line2, null);
  assert.equal(addr.city, "Peshawar");
  assert.equal(addr.postal_code, "25000");
});
