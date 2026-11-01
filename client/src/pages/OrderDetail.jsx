import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api.js";
import { formatPKR } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import { PaymentBadge, StatusBadge } from "../components/OrderBadges.jsx";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function readAddress(shipping) {
  if (!shipping) return null;
  if (typeof shipping === "string") {
    try {
      return JSON.parse(shipping);
    } catch {
      return null;
    }
  }
  return shipping;
}

// One order in full: items, line totals, the grand total, and where it ships.
// The route is guarded, and the API only ever answers for the caller's own
// order, so anything else lands in the not-found state.
export default function OrderDetail() {
  const { user, token } = useAuth();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get(`/orders/${id}`, token)
      .then((data) => {
        if (active) setOrder(data.order);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load this order. Try again."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [user, token, id]);

  if (!user) return <Navigate to="/login" replace />;

  if (error) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Order #{id}</h1>
        <p className="mt-3 text-muted">{error}</p>
        <Link
          to="/account/orders"
          className="mt-8 inline-block text-sm text-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          Back to your orders
        </Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Order not found</h1>
        <p className="mt-3 text-muted">
          This order does not exist or belongs to a different account.
        </p>
        <Link
          to="/account/orders"
          className="mt-8 inline-block text-sm text-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          Back to your orders
        </Link>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Order #{id}</h1>
        <p className="mt-3 text-muted">Loading…</p>
      </div>
    );
  }

  const address = readAddress(order.shipping_address);

  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h1 className="text-3xl font-semibold">Order #{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span>Placed {formatDate(order.created_at)}</span>
        <PaymentBadge method={order.payment_method} />
      </p>

      <div className="mt-10 divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-6"
          >
            <div>
              <p className="font-medium">{item.product_name}</p>
              <p className="mt-1 text-sm text-muted">
                Size {item.size} · {formatPKR(item.unit_price_cents)} × {item.quantity}
              </p>
            </div>
            <div className="font-medium">
              {formatPKR(item.unit_price_cents * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-baseline justify-between">
        <span className="text-sm text-muted">Total</span>
        <span className="text-xl font-semibold">{formatPKR(order.total_cents)}</span>
      </div>

      {address && (
        <div className="mt-12 max-w-md">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Shipping address
          </h2>
          <p className="mt-3 font-medium">{address.full_name}</p>
          <p className="mt-1 text-sm text-muted">{address.phone}</p>
          <p className="mt-3 text-sm">
            {address.address_line1}
            {address.address_line2 ? <>, {address.address_line2}</> : null}
            <br />
            {address.city} {address.postal_code}
          </p>
        </div>
      )}

      <Link
        to="/account/orders"
        className="mt-12 inline-block text-sm text-muted underline underline-offset-4 transition-colors hover:text-ink"
      >
        Back to your orders
      </Link>
    </div>
  );
}
