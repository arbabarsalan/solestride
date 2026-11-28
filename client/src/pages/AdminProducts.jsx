import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../lib/api.js";
import { formatPKR } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";

const BLANK = {
  name: "",
  brand: "",
  description: "",
  category_id: "",
  price_rupees: "",
  stock: "0",
  sizes: "",
  colors: "",
  image_url: "",
};

// The admin's product catalog: add, edit, archive, and swap photos. Only a
// signed-in admin gets in; anyone else is sent back to the storefront.
export default function AdminProducts() {
  const { user, token } = useAuth();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | product
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let active = true;
    api
      .get("/admin/products", token)
      .then((data) => {
        if (active) setProducts(data.products || []);
      })
      .catch((err) => {
        if (active) {
          if (err instanceof ApiError && err.status === 403) {
            setProducts([]);
          } else {
            setError(err instanceof ApiError ? err.message : "Could not load products.");
          }
        }
      });
    api
      .get("/categories")
      .then((data) => {
        if (active) setCategories(data.categories || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, token]);

  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  const toCsv = (value) =>
    String(value)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  function openNew() {
    setEditing("new");
    setForm(BLANK);
    setFormError("");
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name: product.name,
      brand: product.brand,
      description: product.description,
      category_id: product.category_id ? String(product.category_id) : "",
      price_rupees: String(Math.round(product.price_cents / 100)),
      stock: String(product.stock),
      sizes: (product.sizes || []).join(", "),
      colors: (product.colors || []).join(", "),
      image_url: product.image_url || "",
    });
    setFormError("");
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setFormError("");
    const priceRupees = Number(form.price_rupees);
    const stock = Number(form.stock);
    if (!form.name.trim() || !form.brand.trim() || !form.description.trim()) {
      setFormError("Name, brand aur description zaroori hain.");
      return;
    }
    if (!Number.isFinite(priceRupees) || priceRupees <= 0) {
      setFormError("Price rupees mein sahi likhein.");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setFormError("Stock 0 ya us se zyada hona chahiye.");
      return;
    }
    const payload = {
      name: form.name,
      brand: form.brand,
      description: form.description,
      price_cents: Math.round(priceRupees * 100),
      stock,
      sizes: toCsv(form.sizes),
      colors: toCsv(form.colors),
    };
    if (form.category_id) payload.category_id = Number(form.category_id);
    if (editing === "new" || form.image_url !== (editing?.image_url || "")) {
      payload.image_url = form.image_url;
    }

    setSaving(true);
    try {
      if (editing === "new") {
        const data = await api.post("/admin/products", payload, token);
        setProducts((rows) => [data.product, ...(rows || [])]);
      } else {
        const data = await api.patch(`/admin/products/${editing.id}`, payload, token);
        setProducts((rows) => rows.map((row) => (row.id === data.product.id ? data.product : row)));
      }
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Save nahi hua. Dobara koshish karein.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(product, file) {
    if (!file) return;
    setFormError("");
    try {
      const res = await fetch(`/api/admin/products/${product.id}/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: (() => {
          const body = new FormData();
          body.append("image", file);
          return body;
        })(),
      });
      const data = await res.json();
      if (!res.ok) throw new ApiError(data.error || "Image upload failed", res.status);
      setProducts((rows) => rows.map((row) => (row.id === data.product.id ? { ...row, ...data.product } : row)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image upload nahi hui.");
    }
  }

  async function archive(product) {
    if (!window.confirm(`"${product.name}" ko catalog se hata dein? (Archive ho jayega)`)) return;
    setError("");
    try {
      const data = await api.del(`/admin/products/${product.id}`, token);
      setProducts((rows) => rows.map((row) => (row.id === data.product.id ? { ...row, ...data.product } : row)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Archive nahi hua.");
    }
  }

  async function restore(product) {
    setError("");
    try {
      const data = await api.patch(`/admin/products/${product.id}`, { is_active: true }, token);
      setProducts((rows) => rows.map((row) => (row.id === data.product.id ? { ...row, ...data.product } : row)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Restore nahi hua.");
    }
  }

  if (error && !products) {
    return (
      <div className="mx-auto max-w-shell px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Products</h1>
        <p className="mt-3 text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <nav className="flex gap-6 text-sm" aria-label="Admin">
        <Link to="/admin/orders" className="text-muted transition-colors hover:text-ink">
          Orders
        </Link>
        <span className="font-medium text-ink underline underline-offset-4" aria-current="page">
          Products
        </span>
      </nav>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-muted">
            {products ? `${products.length} products in the catalog` : "Loading…"}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-full border border-ink bg-ink px-5 py-2 text-sm text-white transition-colors hover:bg-ink/90"
        >
          + Add product
        </button>
      </div>

      {editing && (
        <form
          onSubmit={save}
          className="mt-8 border border-line bg-canvas p-6"
          aria-label={editing === "new" ? "Add product" : `Edit ${editing.name}`}
        >
          <h2 className="text-lg font-semibold">
            {editing === "new" ? "Add a product" : `Edit: ${editing.name}`}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted">Name</span>
              <input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Brand</span>
              <input
                value={form.brand}
                onChange={(e) => setField("brand", e.target.value)}
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Category</span>
              <select
                value={form.category_id}
                onChange={(e) => setField("category_id", e.target.value)}
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink focus:border-ink focus:outline-none"
              >
                <option value="">(none)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted">Price (rupees)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.price_rupees}
                onChange={(e) => setField("price_rupees", e.target.value)}
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Stock</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(e) => setField("stock", e.target.value)}
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Sizes (comma separated)</span>
              <input
                value={form.sizes}
                onChange={(e) => setField("sizes", e.target.value)}
                placeholder="S, M, L"
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Colors (comma separated)</span>
              <input
                value={form.colors}
                onChange={(e) => setField("colors", e.target.value)}
                placeholder="Off-white, Teal"
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">Image URL (optional, /assets/… ya poori link)</span>
              <input
                value={form.image_url}
                onChange={(e) => setField("image_url", e.target.value)}
                className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink focus:border-ink focus:outline-none"
              />
            </label>
          </div>
          {formError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {formError}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full border border-ink bg-ink px-5 py-2 text-sm text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : editing === "new" ? "Create product" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-line bg-canvas px-5 py-2 text-sm text-muted transition-colors hover:border-ink hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {products && products.length === 0 ? (
        <p className="mt-12 text-muted">No products yet. Use "Add product" to create the first one.</p>
      ) : products ? (
        <div className="mt-10 overflow-x-auto border-y border-line">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-widest text-muted">
                <th scope="col" className="py-3 pr-6 font-medium">Product</th>
                <th scope="col" className="py-3 pr-6 font-medium">Category</th>
                <th scope="col" className="py-3 pr-6 font-medium">Price</th>
                <th scope="col" className="py-3 pr-6 font-medium">Stock</th>
                <th scope="col" className="py-3 pr-6 font-medium">Status</th>
                <th scope="col" className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-surface">
                  <td className="py-4 pr-6">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-surface" aria-hidden="true" />
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted">/{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-6 text-muted">{product.category_name || "—"}</td>
                  <td className="whitespace-nowrap py-4 pr-6">{formatPKR(product.price_cents)}</td>
                  <td className="py-4 pr-6">
                    <span className={product.stock === 0 ? "text-red-700" : ""}>{product.stock}</span>
                  </td>
                  <td className="py-4 pr-6">
                    {product.is_active ? (
                      <span className="text-xs text-muted">Active</span>
                    ) : (
                      <span className="text-xs uppercase tracking-widest text-muted">Archived</span>
                    )}
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="text-ink underline underline-offset-2"
                      >
                        Edit
                      </button>
                      <label className="cursor-pointer text-muted underline underline-offset-2">
                        Photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            uploadImage(product, e.target.files[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {product.is_active ? (
                        <button
                          type="button"
                          onClick={() => archive(product)}
                          className="text-muted underline underline-offset-2 hover:text-red-700"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => restore(product)}
                          className="text-muted underline underline-offset-2 hover:text-ink"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {error && products && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
