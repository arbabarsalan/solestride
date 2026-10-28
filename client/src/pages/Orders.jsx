import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../lib/api.js";
import { formatPKR } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_CLASS = {
  pending: "text-muted",
  paid: "text-accent",
  shipped: "text-accent",
  delivered: "text-accent",
  cancelled: "text-red-700",
};

const PAYMENT_LABEL = {
  cod: "Cash on delivery",
  stripe: "Stripe",
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// The account order history: the caller's own orders, newest first.
// The route is guarded, so a signed-out visitor is sent to /login.
export default function Orders() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get("/orders", token)
      .then((data) => {
        if (active) setOrders(data.orders || []);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load your orders. Try again."
          );
      });
    return () => {
      active = false;
    };
  }, [user, token]);

  if (!user) return <Navigate to="/login" replace />;

  if (error) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Your orders</h1>
        <p className="mt-3 text-muted">{error}</p>
      </div>
    );
  }

  if (orders === null) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Your orders</h1>
        <p className="mt-3 text-muted">Loading…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">No orders yet</h1>
        <p className="mt-3 text-muted">When you place an order, it shows up here.</p>
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
      <h1 className="text-3xl font-semibold">Your orders</h1>

      <div className="mt-10 divide-y divide-line border-y border-line">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/account/orders/${order.id}`}
            className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-6 transition-colors hover:bg-surface"
          >
            <div className="min-w-40">
              <p className="font-medium">Order #{order.id}</p>
              <p className="mt-1 text-sm text-muted">{formatDate(order.created_at)}</p>
            </div>
            <div className="text-sm text-muted">
              {PAYMENT_LABEL[order.payment_method] || order.payment_method}
            </div>
            <div className="font-medium">{formatPKR(order.total_cents)}</div>
            <div className={`text-sm ${STATUS_CLASS[order.status] || "text-muted"}`}>
              {order.status}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
