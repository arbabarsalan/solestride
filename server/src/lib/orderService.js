// Order creation logic: pure validation + the transaction that turns a cart
// into an order. The DB work takes a pool/client so it can be exercised
// against the real schema. All money is integer paisa (PKR).

const { quote } = require("./cartPricing");

// Same address contract the checkout quote endpoint enforces.
const REQUIRED_ADDRESS = ["full_name", "phone", "address_line1", "city", "postal_code"];
const PAYMENT_METHODS = ["cod", "stripe"];

// Returns a list of problems; an empty list means the request is valid.
function validateOrderInput(body) {
  const errors = [];
  const b = body || {};
  for (const field of REQUIRED_ADDRESS) {
    if (!b[field] || !String(b[field]).trim()) errors.push(`${field} is required`);
  }
  if (!PAYMENT_METHODS.includes(b.payment_method)) {
    errors.push("payment_method must be 'cod' or 'stripe'");
  }
  return errors;
}

// Builds the shipping address object we store as JSONB, trimmed.
function buildShippingAddress(body) {
  const line2 = body.address_line2 ? String(body.address_line2).trim() : "";
  return {
    full_name: String(body.full_name).trim(),
    phone: String(body.phone).trim(),
    address_line1: String(body.address_line1).trim(),
    address_line2: line2 ? line2 : null,
    city: String(body.city).trim(),
    postal_code: String(body.postal_code).trim(),
  };
}

// Inside one transaction: snapshot the cart, create the order and its items,
// decrement stock, and clear the cart. Throws when the cart is empty, a
// product changed underneath us, or stock ran out.
async function createOrderFromCart(db, userId, body) {
  const errors = validateOrderInput(body);
  if (errors.length > 0) {
    const err = new Error("Invalid order input");
    err.details = errors;
    err.statusCode = 400;
    throw err;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const { rows: cartRows } = await client.query(
      `SELECT ci.product_id, ci.size, ci.quantity, p.name, p.price_cents, p.stock
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1
       ORDER BY ci.added_at DESC
       FOR UPDATE OF p`,
      [userId]
    );
    if (cartRows.length === 0) {
      const err = new Error("Your cart is empty");
      err.statusCode = 400;
      throw err;
    }

    // Stock must cover every line as it stands now.
    for (const line of cartRows) {
      if (line.stock === null) continue; // not tracked for this product
      if (line.stock < line.quantity) {
        const err = new Error(`Not enough stock for ${line.name}`);
        err.details = { product_id: line.product_id, stock: line.stock, requested: line.quantity };
        err.statusCode = 409;
        throw err;
      }
    }

    const pricing = quote(cartRows.map((r) => ({ price_cents: r.price_cents, quantity: r.quantity })));
    const shippingAddress = buildShippingAddress(body);
    const paymentMethod = body.payment_method;

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (user_id, status, total_cents, payment_method, shipping_address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, status, total_cents, payment_method, shipping_address, created_at, updated_at`,
      [userId, "pending", pricing.total_cents, paymentMethod, JSON.stringify(shippingAddress)]
    );
    const order = orderRows[0];

    const { rows: itemRows } = await client.query(
      `INSERT INTO order_items (order_id, product_id, product_name, size, unit_price_cents, quantity)
       SELECT $1, ci.product_id, p.name, ci.size, p.price_cents, ci.quantity
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $2
       RETURNING id, product_id, product_name, size, unit_price_cents, quantity`,
      [order.id, userId]
    );

    // Decrement stock for products that track it.
    await client.query(
      `UPDATE products p
       SET stock = p.stock - ci.quantity
       FROM cart_items ci
       WHERE ci.user_id = $1 AND ci.product_id = p.id AND p.stock IS NOT NULL`,
      [userId]
    );

    await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);

    await client.query("COMMIT");
    return { order, items: itemRows };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Serializes an order with its items for API responses.
function orderView(order, items) {
  return {
    id: order.id,
    user_id: order.user_id,
    status: order.status,
    total_cents: order.total_cents,
    payment_method: order.payment_method,
    shipping_address: order.shipping_address,
    created_at: order.created_at,
    items,
  };
}

module.exports = { validateOrderInput, buildShippingAddress, createOrderFromCart, orderView, REQUIRED_ADDRESS, PAYMENT_METHODS };
