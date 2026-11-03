import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
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

// The admin view of every order in the store, newest first, with the status
// movable inline. The route is guarded: only a signed-in admin gets in, and
// anyone else is sent back to the storefront.
export default function AdminOrders() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let active = true;
    api
      .get("/admin/orders", token)
      .then((data) => {
        if (active) setOrders(data.orders || []);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 403) {
          navigate("/", { replace: true });
        } else {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load the orders. Try again."
          );
        }
      });
    return () => {
      active = false;
    };
  }, [user, token, navigate]);

  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  if (error) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Orders</h1>
        <p className="mt-3 text-muted">{error}</p>
      </div>
    );
  }

  if (orders === null) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Orders</h1>
        <p className="mt-3 text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <h1 className="text-3xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm text-muted">
        {orders.length} {orders.length === 1 ? "order" : "orders"} in the store
      </p>

      {rowError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {rowError}
        </p>
      )}

      {orders.length === 0 ? (
        <p className="mt-10 text-muted">No orders yet.</p>
      ) : (
        <div className="mt-10 overflow-x-auto border-y border-line">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                <th scope="col" className="py-3 pr-6 font-medium">Order</th>
                <th scope="col" className="py-3 pr-6 font-medium">Placed</th>
                <th scope="col" className="py-3 pr-6 font-medium">Customer</th>
                <th scope="col" className="py-3 pr-6 font-medium">Total</th>
                <th scope="col" className="py-3 pr-6 font-medium">Payment</th>
                <th scope="col" className="py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-surface">
                  <td className="py-4 pr-6 font-medium">#{order.id}</td>
                  <td className="py-4 pr-6 text-muted">{formatDate(order.created_at)}</td>
                  <td className="py-4 pr-6">
                    {order.customer_name || order.customer_email}
                  </td>
                  <td className="py-4 pr-6">{formatPKR(order.total_cents)}</td>
                  <td className="py-4 pr-6">
                    <PaymentBadge method={order.payment_method} />
                  </td>
                  <td className="py-4">
                    <StatusBadge status={order.status} />
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
