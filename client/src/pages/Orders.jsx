import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
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

// The account order history: the caller's own orders, newest first.
// The route is guarded, so a signed-out visitor is sent to /login.
export default function Orders() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(5);
  // Skeleton bars wait a beat before appearing, so an instant cached load
  // never flashes them.
  const [skeletonReady, setSkeletonReady] = useState(false);

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

  useEffect(() => {
    if (orders !== null) {
      setSkeletonReady(false);
      return;
    }
    const timer = setTimeout(() => setSkeletonReady(true), 180);
    return () => clearTimeout(timer);
  }, [orders]);

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
      <div className="mx-auto max-w-shell px-6 py-16">
        <h1 className="text-3xl font-semibold">Your orders</h1>
        <div className="mt-10 divide-y divide-line border-y border-line" aria-busy="true">
          {skeletonReady &&
            [0, 1, 2].map((row) => (
              <div
                key={row}
                aria-hidden="true"
                className="flex items-center justify-between gap-x-8 py-6"
              >
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse motion-reduce:animate-none bg-line" />
                  <div className="h-3 w-32 animate-pulse motion-reduce:animate-none bg-surface" />
                </div>
                <div className="h-5 w-16 animate-pulse motion-reduce:animate-none bg-line" />
                <div className="h-3 w-20 animate-pulse motion-reduce:animate-none bg-surface" />
                <div className="h-5 w-16 animate-pulse motion-reduce:animate-none bg-line" />
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <svg
          viewBox="0 0 56 56"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
          className="mx-auto h-14 w-14 text-muted"
        >
          <path d="M17 10h22v33l-3.7-3-3.6 3-3.7-3-3.6 3-3.7-3-3.7 3V10z" />
          <path d="M22 20h12M22 26h12M22 32h7" />
        </svg>
        <h1 className="mt-6 text-3xl font-semibold">No orders yet</h1>
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
        {orders.slice(0, visibleCount).map((order) => (
          <Link
            key={order.id}
            to={`/account/orders/${order.id}`}
            className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 py-6 transition-colors hover:bg-surface"
          >
            <div className="min-w-40">
              <p className="font-medium">Order #{order.id}</p>
              <p className="mt-1 text-sm text-muted">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <PaymentBadge method={order.payment_method} />
            </div>
            <div className="font-medium">{formatPKR(order.total_cents)}</div>
            <div>
              <StatusBadge status={order.status} />
            </div>
          </Link>
        ))}
      </div>

      {orders.length > visibleCount && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 5)}
            className="border border-line px-8 py-3 text-sm font-medium transition-colors hover:border-ink hover:bg-surface"
          >
            Show more
          </button>
          <p className="text-sm text-muted">
            Showing {Math.min(visibleCount, orders.length)} of {orders.length} orders
          </p>
        </div>
      )}
    </div>
  );
}
