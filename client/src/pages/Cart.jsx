import { Link } from "react-router-dom";
import { formatPKR } from "../lib/format.js";
import { useCart } from "../context/CartContext.jsx";

const SHIPPING_PAISA = 25000;
const FREE_SHIPPING_THRESHOLD_PAISA = 500000;

export default function Cart() {
  const { items, updateQty, removeItem, count } = useCart();

  const subtotal = items.reduce((sum, i) => sum + i.price_cents * i.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD_PAISA || subtotal === 0 ? 0 : SHIPPING_PAISA;
  const total = subtotal + shipping;

  if (count === 0) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-3 text-muted">Good shoes are waiting.</p>
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
          <div key={`${item.product_id}:${item.size}`} className="flex gap-6 py-6">
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
                  <p className="mt-1 text-sm text-muted">UK {item.size}</p>
                </div>
                <p className="whitespace-nowrap text-sm font-medium">
                  {formatPKR(item.price_cents * item.qty)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-line">
                  <button
                    onClick={() => updateQty(item.product_id, item.size, item.qty - 1)}
                    className="px-3 py-1.5 text-muted transition-colors hover:text-ink"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.product_id, item.size, item.qty + 1)}
                    className="px-3 py-1.5 text-muted transition-colors hover:text-ink"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.product_id, item.size)}
                  className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
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
          <button className="mt-6 w-full bg-ink py-4 text-sm font-medium text-white transition-colors hover:bg-accent">
            Checkout
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Cash on delivery available. Checkout sign-in comes next.
          </p>
        </div>
      </div>
    </div>
  );
}
