import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api.js";
import { formatPKR } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import { PaymentBadge, StatusBadge } from "../components/OrderBadges.jsx";

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"];
const PAGE_SIZE = 50;

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
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let active = true;
    api
      .get(`/admin/orders?offset=${offset}`, token)
      .then((data) => {
        if (active) {
          setOrders(data.orders || []);
          setTotal(data.total || 0);
        }
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
  }, [user, token, navigate, offset]);

  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  async function changeStatus(order, status) {
    if (status === order.status) return;
    setRowError("");
    const previous = orders;
    setOrders((rows) =>
      rows.map((row) => (row.id === order.id ? { ...row, status } : row))
    );
    try {
      const data = await api.patch(`/admin/orders/${order.id}/status`, { status }, token);
      setOrders((rows) =>
        rows.map((row) => (row.id === order.id ? { ...row, status: data.order.status } : row))
      );
    } catch (err) {
      setOrders(previous);
      setRowError(
        err instanceof ApiError ? err.message : "Could not update the status. Try again."
      );
    }
  }

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

  // The status filter narrows the already-loaded rows; the server list itself
  // stays untouched.
  const countFor = (status) =>
    status === "all" ? orders.length : orders.filter((order) => order.status === status).length;
  const visibleOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((order) => order.status === statusFilter);

  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <h1 className="text-3xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm text-muted">
        {total} {total === 1 ? "order" : "orders"} in the store
      </p>

      <div
        className="mt-8 flex flex-wrap items-center gap-3"
        role="group"
        aria-label="Filter orders by status"
      >
        {["all", ...STATUSES].map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={statusFilter === status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              statusFilter === status
                ? "border border-ink bg-ink text-white"
                : "border border-line text-muted hover:border-ink"
            }`}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-2 text-xs opacity-60">{countFor(status)}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-muted">
          Page {Math.floor(offset / PAGE_SIZE) + 1} of{" "}
          {Math.max(1, Math.ceil(total / PAGE_SIZE))}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            disabled={offset === 0}
            className="border border-line bg-canvas px-3 py-1.5 text-sm text-muted transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="border border-line bg-canvas px-3 py-1.5 text-sm text-muted transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {rowError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {rowError}
        </p>
      )}

      {orders.length === 0 ? (
        <div className="mt-12">
          <p className="text-muted">
          {offset > 0 ? "No orders on this page." : "No orders yet."}
        </p>
          <p className="mt-2 text-sm text-muted">
            When customers check out, their orders land here.
          </p>
        </div>
      ) : visibleOrders.length === 0 ? (
        <p className="mt-12 text-muted">No orders with this status.</p>
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
              {visibleOrders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-surface">
                  <td className="whitespace-nowrap py-4 pr-6 font-medium">#{order.id}</td>
                  <td className="py-4 pr-6 text-muted">{formatDate(order.created_at)}</td>
                  <td className="py-4 pr-6">
                    {order.customer_name || order.customer_email}
                  </td>
                  <td className="whitespace-nowrap py-4 pr-6">{formatPKR(order.total_cents)}</td>
                  <td className="py-4 pr-6">
                    <PaymentBadge method={order.payment_method} />
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={order.status} />
                      <label className="sr-only" htmlFor={`status-${order.id}`}>
                        Change status for order #{order.id}
                      </label>
                      <select
                        id={`status-${order.id}`}
                        value={order.status}
                        onChange={(e) => changeStatus(order, e.target.value)}
                        className="border border-line bg-canvas px-2 py-1 text-xs text-muted focus:border-ink"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
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
