import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { formatPKR } from "../lib/format.js";
import { useCart } from "../context/CartContext.jsx";

export default function Product() {
  const { slug } = useParams();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [size, setSize] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setProduct(null);
    setError(null);
    setSize(null);
    setAdded(false);
    api
      .get(`/products/${slug}`)
      .then((data) => setProduct(data.product))
      .catch((err) => setError(err.message));
  }, [slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <p className="mt-3 text-muted">
          {error}. <Link to="/shop" className="underline">Back to shop</Link>.
        </p>
      </div>
    );
  }

  if (!product) {
    return <p className="mx-auto max-w-shell px-6 py-24 text-sm text-muted">Loading…</p>;
  }

  const sizes = Array.isArray(product.sizes) ? product.sizes : JSON.parse(product.sizes || "[]");
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;

  function handleAdd() {
    if (!size) return;
    addItem(product, size);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/shop" className="hover:text-ink">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={`/shop?category=${product.category_slug}`} className="hover:text-ink">
              {product.category_name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-12 md:grid-cols-2">
        <div className="bg-surface">
          <img
            src={product.image_url}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted">{product.brand}</p>
          <h1 className="mt-2 text-4xl font-semibold">{product.name}</h1>
          <p className="mt-3 text-xl font-medium">{formatPKR(product.price_cents)}</p>

          <div className="mt-8">
            <p className="text-sm font-medium">Size</p>
            <div role="group" aria-label="Select a size" className="mt-3 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  aria-label={`Size ${s}`}
                  onClick={() => setSize(s)}
                  className={`min-w-12 border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
                    size === s
                      ? "border-ink bg-ink text-white"
                      : "border-line text-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-label={`Add ${product.name}${size ? `, size ${size}` : ""} to cart`}
            onClick={handleAdd}
            disabled={!size || soldOut}
            className="mt-8 w-full bg-ink py-4 text-sm font-medium text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-muted md:w-auto md:px-16"
          >
            {soldOut ? "Sold out" : added ? "Added to cart" : size ? "Add to cart" : "Pick a size"}
          </button>

          {!soldOut && (
            <p className="mt-3 text-sm text-muted">
              Need more than one? You can adjust the quantity in your cart.
            </p>
          )}

          {soldOut && (
            <p className="mt-3 text-sm text-muted">
              This one is sold out.{" "}
              <Link to="/shop" className="underline hover:text-ink">
                Browse the rest of the shop
              </Link>
            </p>
          )}

          {lowStock && (
            <p className="mt-3 inline-block border border-line px-2 py-1 text-xs text-accent">
              Only {product.stock} left
            </p>
          )}

          <div className="mt-10 border-t border-line pt-8">
            <p className="leading-relaxed text-muted">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
