import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import ProductCard from "../components/ProductCard.jsx";

const PER_PAGE = 12;

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const category = searchParams.get("category") || "";
  const [sort, setSort] = useState("newest");

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

  // Sorting only orders the page the API already returned; the server keeps
  // its own order for pagination.
  const sorted = useMemo(() => {
    if (!products) return null;
    const list = [...products];
    if (sort === "price-asc") list.sort((a, b) => a.price_cents - b.price_cents);
    if (sort === "price-desc") list.sort((a, b) => b.price_cents - a.price_cents);
    return list;
  }, [products, sort]);

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

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={!category}
          onClick={() => pickCategory("")}
          className={`rounded-full px-4 py-2 text-sm transition-colors ${
            category
              ? "border border-line text-muted hover:border-ink"
              : "border border-ink bg-ink text-white"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            aria-pressed={category === c.slug}
            onClick={() => pickCategory(c.slug)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              category === c.slug
                ? "border border-ink bg-ink text-white"
                : "border border-line text-muted hover:border-ink"
            }`}
          >
            {c.name}
            <span className="ml-2 text-xs opacity-60">{c.product_count}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label
            htmlFor="shop-sort"
            className="text-xs uppercase tracking-[0.25em] text-muted"
          >
            Sort
          </label>
          <span className="relative inline-flex items-center">
            <select
              id="shop-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-full border border-line bg-canvas py-2 pl-4 pr-9 text-sm text-muted transition-colors hover:border-ink hover:text-ink focus:border-ink focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="pointer-events-none absolute right-3 h-3 w-3 text-muted"
            >
              <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>

      {error && <p className="mt-12 text-sm text-muted">Could not load products right now.</p>}
      {!error && !products && <p className="mt-12 text-sm text-muted">Loading…</p>}
      {products && products.length === 0 && (
        <p className="mt-12 text-sm text-muted">Nothing in this category yet.</p>
      )}
      {products && products.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
          {sorted.map((p) => (
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
