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
      .then(setProduct)
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
    <div className="mx-auto max-w-shell px-6 py-12">
      <nav className="text-sm text-muted">
        <Link to="/shop" className="hover:text-ink">Shop</Link>
        <span className="mx-2">/</span>
        <Link to={`/shop?category=${product.category_slug}`} className="hover:text-ink">
          {product.category_name}
        </Link>
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
            <div className="mt-3 flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`min-w-12 border px-3 py-2 text-sm transition-colors ${
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
            onClick={handleAdd}
            disabled={!size || soldOut}
            className="mt-8 w-full bg-ink py-4 text-sm font-medium text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:bg-line disabled:text-muted md:w-auto md:px-16"
          >
            {soldOut ? "Sold out" : added ? "Added to cart" : size ? "Add to cart" : "Pick a size"}
          </button>

          {lowStock && (
            <p className="mt-3 text-sm text-accent">Only {product.stock} left in stock.</p>
          )}

          <div className="mt-10 border-t border-line pt-8">
            <p className="leading-relaxed text-muted">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
