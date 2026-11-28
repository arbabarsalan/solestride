const express = require("express");
const multer = require("multer");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const pool = require("../db/pool");

const router = express.Router();

// Everything in here is admin-only.
router.use(requireAuth, requireAdmin);

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = { "image/jpeg": "image/jpeg", "image/png": "image/png", "image/webp": "image/webp" };

// Uploaded photos are kept in memory and stored in the database, so they keep
// working on serverless hosting where the filesystem is not persistent.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES[file.mimetype]) {
      return cb(new Error("Only JPEG, PNG or WebP images are allowed"));
    }
    cb(null, true);
  },
});

function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  ) || "product";
}

const PRODUCT_COLUMNS = `p.id, p.category_id, p.name, p.slug, p.brand, p.description,
         p.price_cents, p.currency, p.sizes, p.colors, p.stock, p.image_url,
         p.is_active, p.created_at, c.slug AS category_slug, c.name AS category_name`;

function readProductBody(body) {
  const b = body || {};
  const errors = [];

  const fields = {};
  if (b.name !== undefined) {
    const name = String(b.name).trim();
    if (!name) errors.push("name is required");
    else fields.name = name;
  }
  if (b.brand !== undefined) {
    const brand = String(b.brand).trim();
    if (!brand) errors.push("brand is required");
    else fields.brand = brand;
  }
  if (b.description !== undefined) {
    const description = String(b.description).trim();
    if (!description) errors.push("description is required");
    else fields.description = description;
  }
  if (b.price_cents !== undefined) {
    const price = Number(b.price_cents);
    if (!Number.isInteger(price) || price <= 0) errors.push("price_cents must be a positive integer (paisa)");
    else fields.price_cents = price;
  }
  if (b.stock !== undefined) {
    const stock = Number(b.stock);
    if (!Number.isInteger(stock) || stock < 0) errors.push("stock must be a non-negative integer");
    else fields.stock = stock;
  }
  if (b.category_id !== undefined) {
    const categoryId = Number(b.category_id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) errors.push("category_id must be a positive integer");
    else fields.category_id = categoryId;
  }
  for (const key of ["sizes", "colors"]) {
    if (b[key] !== undefined) {
      if (!Array.isArray(b[key]) || b[key].some((v) => typeof v !== "string")) {
        errors.push(`${key} must be an array of strings`);
      } else {
        fields[key] = JSON.stringify(b[key]);
      }
    }
  }
  if (b.image_url !== undefined) {
    const imageUrl = String(b.image_url).trim();
    fields.image_url = imageUrl || null;
  }
  if (b.slug !== undefined) {
    const slug = slugify(b.slug);
    if (!slug) errors.push("slug is invalid");
    else fields.slug = slug;
  }

  return { fields, errors };
}

// GET /api/admin/products -> every product, including hidden ones.
router.get("/products", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.created_at DESC, p.id DESC`
    );
    res.json({ products: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products { name, brand, description, price_cents, stock,
// category_id, sizes?, colors?, image_url? } -> creates a product.
// The slug comes from the name; a collision gets a -2, -3 suffix.
router.post("/products", async (req, res, next) => {
  try {
    const { fields, errors } = readProductBody(req.body);
    if (errors.length > 0) return res.status(400).json({ error: errors.join("; ") });

    for (const key of ["name", "brand", "description", "price_cents", "stock"]) {
      if (fields[key] === undefined) {
        return res.status(400).json({ error: `${key} is required` });
      }
    }
    if (fields.category_id === undefined) {
      return res.status(400).json({ error: "category_id is required" });
    }

    const base = slugify(fields.name);
    const { rows: taken } = await pool.query(
      `SELECT slug FROM products WHERE slug = $1 OR slug LIKE $2`,
      [base, `${base}-%`]
    );
    let slug = base;
    let n = 1;
    const used = new Set(taken.map((r) => r.slug));
    while (used.has(slug)) {
      n += 1;
      slug = `${base}-${n}`;
    }

    const { rows } = await pool.query(
      `INSERT INTO products (category_id, name, slug, brand, description, price_cents,
                            sizes, colors, stock, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
       RETURNING id`,
      [
        fields.category_id,
        fields.name,
        slug,
        fields.brand,
        fields.description,
        fields.price_cents,
        fields.sizes ?? "[]",
        fields.colors ?? "[]",
        fields.stock,
        fields.image_url ?? null,
      ]
    );

    const { rows: created } = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [rows[0].id]
    );
    res.status(201).json({ product: created[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/products/:id -> updates the fields that were sent.
router.patch("/products/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: "Could not find a product with that id" });
    }
    const { fields, errors } = readProductBody(req.body);
    if (errors.length > 0) return res.status(400).json({ error: errors.join("; ") });
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const keys = Object.keys(fields);
    const params = keys.map((k) => fields[k]);
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE products SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(", ")}
       WHERE id = $${keys.length + 1}
       RETURNING id`,
      params
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Could not find a product with that id" });
    }

    const { rows: updated } = await pool.query(
      `SELECT ${PRODUCT_COLUMNS}
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [rows[0].id]
    );
    res.json({ product: updated[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id -> archives the product instead of deleting
// the row, so past orders keep pointing at something real.
router.delete("/products/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: "Could not find a product with that id" });
    }
    const { rows } = await pool.query(
      `UPDATE products SET is_active = false WHERE id = $1
       RETURNING id, slug, is_active`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Could not find a product with that id" });
    }
    res.json({ product: rows[0], archived: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products/:id/image  (multipart/form-data, field: image)
// Stores the photo in the database and points the product's image_url at it.
router.post("/products/:id/image", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }
    if (!ALLOWED_MIMES[req.file.mimetype]) {
      return res.status(400).json({ error: "Only JPEG, PNG or WebP images are allowed" });
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ error: "Could not find a product with that id" });
    }
    const imageUrl = `/api/products/${id}/image`;
    await pool.query(
      `INSERT INTO product_images (product_id, mime, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data`,
      [id, req.file.mimetype, req.file.buffer]
    );
    const { rows } = await pool.query(
      `UPDATE products SET image_url = $1 WHERE id = $2 RETURNING id, slug, image_url`,
      [imageUrl, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Could not find a product with that id" });
    }
    res.json({ product: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
