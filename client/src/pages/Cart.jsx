import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPKR } from "../lib/format.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const MAX_QTY = 10;
const SHIPPING_PAISA = 25000;
const FREE_SHIPPING_THRESHOLD_PAISA = 500000;

export default function Cart() {
  const { items, updateQty, removeItem, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Typed quantities live here until blur: keyed by product:size, with one
  // validation message per row, so editing one line never touches the rest.
  const [drafts, setDrafts] = useState({});
  const [rowErrors, setRowErrors] = useState({});
  // Rows mid-remove stay rendered one beat longer so they can animate out;
  // keyed like drafts so a rapid second click on the same row is a no-op.
  const [removing, setRemoving] = useState({});
  const timersRef = useRef(new Set());

  useEffect(
    () => () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    },
    []
  );

  const rowKey = (item) => `${item.product_id}:${item.size}`;

  function setDraft(item, value) {
    const key = rowKey(item);
    setDrafts((prev) => ({ ...prev, [key]: value }));
    setRowErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function commitDraft(item) {
    const key = rowKey(item);
    const raw = (drafts[key] ?? "").trim();
    if (raw === "") {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setRowErrors((prev) => ({
        ...prev,
        [key]: "Quantity must be a number between 1 and 10.",
      }));
      return;
    }
    const qty = Math.max(1, Math.min(MAX_QTY, parseInt(raw, 10)));
    if (String(qty) !== raw) {
      setRowErrors((prev) => ({
        ...prev,
        [key]: `Quantity must be between 1 and ${MAX_QTY}. We set it to ${qty}.`,
      }));
    }
    updateQty(item.product_id, item.size, qty);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleRemove(item) {
    const key = rowKey(item);
    if (removing[key]) return;
    setRemoving((prev) => ({ ...prev, [key]: true }));
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      setRemoving((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      removeItem(item.product_id, item.size);
    }, 260);
    timersRef.current.add(timer);
  }

  const subtotal = items.reduce((sum, i) => sum + i.price_cents * i.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD_PAISA || subtotal === 0 ? 0 : SHIPPING_PAISA;
  const total = subtotal + shipping;

  if (count === 0) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-3 text-muted">Your wardrobe is waiting.</p>
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
      <h1 className="text-3xl font-semibold">Your cart</h1>

      <div className="mt-10 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <div
            key={`${item.product_id}:${item.size}`}
            className={`flex gap-6 overflow-hidden transition-[max-height,opacity,padding] duration-300 ease-out motion-reduce:transition-none ${
              removing[rowKey(item)]
                ? "max-h-0 py-0 opacity-0"
                : "max-h-64 opacity-100"
            }`}
          >
            <Link to={`/product/${item.slug}`} className="shrink-0">
              <img
                src={item.image_url}
                alt={item.name}
                className="h-28 w-28 bg-surface object-cover"
              />
            </Link>
            <div className="flex flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted">{item.brand}</p>
                  <Link to={`/product/${item.slug}`} className="mt-1 block font-medium hover:underline">
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{item.size}</p>
                </div>
                <p className="whitespace-nowrap text-sm font-medium">
                  {formatPKR(item.price_cents * item.qty)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-line">
                  <button
                    onClick={() => updateQty(item.product_id, item.size, item.qty - 1)}
                    disabled={item.qty <= 1}
                    className="px-3 py-1.5 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={drafts[rowKey(item)] ?? String(item.qty)}
                    onChange={(e) =>
                      setDraft(item, e.target.value.replace(/\D/g, "").slice(0, 2))
                    }
                    onBlur={() => commitDraft(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    aria-label={`Quantity for ${item.name}, size ${item.size}`}
                    className="w-8 border-0 bg-transparent p-0 text-center text-sm focus:outline-none"
                  />
                  <button
                    onClick={() => updateQty(item.product_id, item.size, item.qty + 1)}
                    disabled={item.qty >= MAX_QTY}
                    title={item.qty >= MAX_QTY ? `Maximum ${MAX_QTY} per style` : undefined}
                    className="px-3 py-1.5 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                {rowErrors[rowKey(item)] && (
                  <p role="alert" className="text-xs text-red-700">
                    {rowErrors[rowKey(item)]}
                  </p>
                )}
                <button
                  onClick={() => handleRemove(item)}
                  disabled={removing[rowKey(item)]}
                  className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span>{formatPKR(subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted">Shipping</span>
            <span>{shipping === 0 ? "Free" : formatPKR(shipping)}</span>
          </div>
          {shipping > 0 && (
            <p className="mt-2 text-xs text-muted">
              Free shipping on orders over {formatPKR(FREE_SHIPPING_THRESHOLD_PAISA)}.
            </p>
          )}
          <div className="mt-4 flex justify-between border-t border-line pt-4 font-semibold">
            <span>Total</span>
            <span>{formatPKR(total)}</span>
          </div>
          <button
            onClick={() => navigate(user ? "/checkout" : "/login")}
            className="mt-6 w-full bg-ink py-4 text-sm font-medium text-white transition-colors hover:bg-accent"
          >
            {user ? "Checkout" : "Sign in to check out"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Cash on delivery available.
          </p>
        </div>
      </div>
    </div>
  );
}
