import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import ProductCard from "../components/ProductCard.jsx";

export default function Home() {
  const [featured, setFeatured] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/products?limit=4")
      .then((data) => setFeatured(data.products))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <section className="mx-auto grid max-w-shell items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted">New season</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight md:text-6xl">
            Shoes, kept simple.
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-muted">
            A small, honest collection. Sneakers, runners and formals, made to be
            worn every day and priced without the markup.
          </p>
          <Link
            to="/shop"
            className="mt-8 inline-block bg-ink px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-accent"
          >
            Shop the collection
          </Link>
        </div>
        <div className="bg-surface">
          <img
            src="/assets/court-classic-low.jpg"
            alt="Court Classic Low sneaker"
            className="aspect-[4/5] w-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-shell px-6 pb-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Featured</h2>
          <Link to="/shop" className="text-sm text-muted hover:text-ink">
            View all
          </Link>
        </div>
        {error && <p className="mt-6 text-sm text-muted">Could not load products right now.</p>}
        {!error && !featured && <p className="mt-6 text-sm text-muted">Loading…</p>}
        {featured && (
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
