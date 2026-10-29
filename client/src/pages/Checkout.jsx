import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../lib/api.js";
import { formatPKR } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

const SHIPPING_PAISA = 25000;
const FREE_SHIPPING_THRESHOLD_PAISA = 500000;

const FIELDS = [
  { key: "full_name", label: "Full name", autoComplete: "name" },
  { key: "phone", label: "Phone", autoComplete: "tel" },
  { key: "address_line1", label: "Address", autoComplete: "address-line1" },
  { key: "city", label: "City", autoComplete: "address-level2" },
  { key: "postal_code", label: "Postal code", autoComplete: "postal-code" },
];

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  postal_code: "",
};

export default function Checkout() {
  const { user, token } = useAuth();
  const { items, clear, count } = useCart();
  const [form, setForm] = useState(EMPTY_FORM);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null);

  if (!user) return <Navigate to="/login" replace />;

  const subtotal = items.reduce((sum, i) => sum + i.price_cents * i.qty, 0);
  const shipping =
    subtotal >= FREE_SHIPPING_THRESHOLD_PAISA || subtotal === 0 ? 0 : SHIPPING_PAISA;
  const total = subtotal + shipping;

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePlace(e) {
    e.preventDefault();
    setError("");

    for (const field of FIELDS) {
      if (!form[field.key].trim()) {
        setError(`${field.label} is required.`);
        return;
      }
    }

    setPlacing(true);
    let order = null;
    try {
      // The order engine reads the signed-in user's server-side cart, so the
      // local cart is pushed there first, one line at a time.
      for (const item of items) {
        await api.post(
          "/cart/items",
          { product_id: item.product_id, size: item.size, quantity: Math.min(item.qty, 10) },
          token
        );
      }

      const data = await api.post(
        "/orders",
        { ...form, payment_method: paymentMethod },
        token
      );
      order = data.order;

      let intent = null;
      if (paymentMethod === "stripe") {
        try {
          const pay = await api.post(
            "/payments/stripe/intent",
            { order_id: order.id },
            token
          );
          intent = pay.payment;
        } catch {
          setError(
            "The order is placed, but the test payment could not start. It can be retried from your orders."
          );
        }
      }

      clear();
      setPlaced({ order, intent });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && order === null) {
        setError(
          Array.isArray(err.details) && err.details.length > 0
            ? err.details.join(". ")
            : err.message
        );
      } else {
        setError(err instanceof ApiError ? err.message : "Could not place the order. Try again.");
      }
    } finally {
      setPlacing(false);
    }
  }

  if (placed) {
    const { order, intent } = placed;
    return (
      <div className="mx-auto max-w-shell px-6 py-16">
        <h1 className="text-3xl font-semibold">Order placed</h1>
        <p className="mt-3 text-muted">
          Order #{order.id} is {order.status}. We saved your address and sent the
          details to {order.shipping_address.full_name}.
        </p>
        <div className="mt-8 max-w-sm space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Total</span>
            <span className="font-medium">{formatPKR(order.total_cents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Payment</span>
            <span>
              {order.payment_method === "cod"
                ? "Cash on delivery"
                : intent
                  ? `Stripe test intent ${intent.payment_intent_id}`
                  : "Stripe test payment pending"}
            </span>
          </div>
          {order.payment_method === "stripe" && intent && (
            <p className="text-xs text-muted">
              Test mode: the order stays pending until the Stripe test webhook confirms the payment.
            </p>
          )}
        </div>
        <Link
          to="/shop"
          className="mt-10 inline-block bg-ink px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-accent"
        >
          Continue shopping
        </Link>
        <Link to={`/account/orders/${order.id}`} className="mt-10 ml-6 text-sm text-muted underline underline-offset-4 transition-colors hover:text-ink">
          View this order
        </Link>
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-3 text-muted">Add something before checking out.</p>
        <Link
          to="/shop"
          className="mt-8 inline-block bg-ink px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-accent"
        >
          Shop the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <h1 className="text-3xl font-semibold">Checkout</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <form onSubmit={handlePlace} className="max-w-md space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className="block text-xs uppercase tracking-widest text-muted">
                {field.label}
              </label>
              <input
                id={field.key}
                type="text"
                value={form[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                autoComplete={field.autoComplete}
                className="mt-1.5 w-full border border-line bg-canvas px-3 py-2.5 text-sm focus:border-ink"
              />
            </div>
          ))}
          <div>
            <label htmlFor="address_line2" className="block text-xs uppercase tracking-widest text-muted">
              Apartment, floor (optional)
            </label>
            <input
              id="address_line2"
              type="text"
              value={form.address_line2}
              onChange={(e) => update("address_line2", e.target.value)}
              autoComplete="address-line2"
              className="mt-1.5 w-full border border-line bg-canvas px-3 py-2.5 text-sm focus:border-ink"
            />
          </div>

          <fieldset className="pt-2">
            <legend className="block text-xs uppercase tracking-widest text-muted">Payment</legend>
            <div className="mt-2 space-y-2">
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                Cash on delivery
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="payment"
                  value="stripe"
                  checked={paymentMethod === "stripe"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                Card (Stripe, test mode)
              </label>
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={placing}
            className="w-full bg-ink py-4 text-sm font-medium text-white transition-colors hover:bg-accent disabled:opacity-60"
          >
            {placing ? "Placing order…" : `Place order (${formatPKR(total)})`}
          </button>
        </form>

        <div>
          <h2 className="text-xs uppercase tracking-widest text-muted">Order summary</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {items.map((item) => (
              <div key={`${item.product_id}:${item.size}`} className="flex items-center gap-4 py-4">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-16 w-16 bg-surface object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.size} × {item.qty}
                  </p>
                </div>
                <p className="text-sm">{formatPKR(item.price_cents * item.qty)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatPKR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Shipping</span>
              <span>{shipping === 0 ? "Free" : formatPKR(shipping)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <span>Total</span>
              <span>{formatPKR(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
