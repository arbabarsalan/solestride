// Pure cart pricing math, kept free of I/O so it can be unit-tested directly.
// All money is integer paisa (PKR).

const SHIPPING_FLAT = 25000;        // PKR 250.00
const FREE_SHIPPING_THRESHOLD = 500000; // free above PKR 5,000.00

function subtotal(items) {
  // items: [{ price_cents, quantity }]
  return items.reduce((sum, it) => sum + it.price_cents * it.quantity, 0);
}

function shippingCents(subtotalCents) {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
}

function quote(items) {
  const itemsSubtotal = subtotal(items);
  const shipping = shippingCents(itemsSubtotal);
  return {
    items_subtotal_cents: itemsSubtotal,
    shipping_cents: shipping,
    total_cents: itemsSubtotal + shipping,
    free_shipping: shipping === 0 && itemsSubtotal > 0,
  };
}

module.exports = { subtotal, shippingCents, quote, SHIPPING_FLAT, FREE_SHIPPING_THRESHOLD };
