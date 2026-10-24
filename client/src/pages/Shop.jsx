import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import ProductCard from "../components/ProductCard.jsx";

const PER_PAGE = 12;

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const category = searchParams.get("category") || "";

  const [products, setProducts] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/categories")
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setProducts(null);
    const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
    if (category) params.set("category", category);

    api
      .get(`/products?${params.toString()}`)
      .then((data) => {
        setProducts(data.products);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(err.message));
  }, [page, category]);

  function goTo(next) {
    const params = {};
    if (next > 1) params.page = String(next);
    if (category) params.category = category;
    setSearchParams(params);
  }

  function pickCategory(slug) {
    const params = {};
    if (slug) params.category = slug;
    setSearchParams(params);
  }

  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <h1 className="text-3xl font-semibold">Shop</h1>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={() => pickCategory("")}
          className={`border px-4 py-2 text-sm transition-colors ${
            category ? "border-line text-muted hover:text-ink" : "border-ink bg-ink text-white"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => pickCategory(c.slug)}
            className={`border px-4 py-2 text-sm transition-colors ${
              category === c.slug
                ? "border-ink bg-ink text-white"
                : "border-line text-muted hover:text-ink"
            }`}
          >
            {c.name}
            <span className="ml-2 text-xs opacity-60">{c.product_count}</span>
          </button>
        ))}
      </div>

      {error && <p className="mt-12 text-sm text-muted">Could not load products right now.</p>}
      {!error && !products && <p className="mt-12 text-sm text-muted">Loading…</p>}
      {products && products.length === 0 && (
        <p className="mt-12 text-sm text-muted">Nothing in this category yet.</p>
      )}
      {products && products.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}

      {products && totalPages > 1 && (
        <div className="mt-16 flex items-center justify-center gap-6 text-sm">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            className="text-muted transition-colors hover:text-ink disabled:invisible"
          >
            Previous
          </button>
          <span className="text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages}
            className="text-muted transition-colors hover:text-ink disabled:invisible"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
