// Small order badges shared by the orders list and the order detail page:
// the payment method (COD on surface, Stripe in the accent) and the fulfilment
// status, both kept to the same restrained pill so the two pages read alike.
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

const BADGE_BASE =
  "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide";

export function StatusBadge({ status }) {
  return (
    <span
      className={`${BADGE_BASE} bg-surface ${STATUS_CLASS[status] || "text-muted"}`}
    >
      {status}
    </span>
  );
}

export function PaymentBadge({ method }) {
  if (method === "stripe") {
    return <span className={`${BADGE_BASE} bg-accent/10 text-accent`}>Stripe</span>;
  }
  return (
    <span className={`${BADGE_BASE} bg-surface text-muted`}>
      {PAYMENT_LABEL[method] || method}
    </span>
  );
}
