import { Link } from "react-router-dom";
import { formatPKR } from "../lib/format.js";

export default function ProductCard({ product }) {
  return (
    <Link to={`/product/${product.slug}`} className="group block">
      <div className="overflow-hidden bg-surface">
        <img
          src={product.image_url}
          alt={product.name}
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">{product.brand}</p>
          <h3 className="mt-1 font-medium leading-snug">{product.name}</h3>
        </div>
        <p
          className="whitespace-nowrap text-sm font-medium text-ink transition-colors duration-150 group-hover:text-accent"
        >
          {formatPKR(product.price_cents)}
        </p>
      </div>
    </Link>
  );
}
