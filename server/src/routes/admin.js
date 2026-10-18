const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const pool = require("../db/pool");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "../../public/uploads");
const ALLOWED_MIMES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Disk storage under public/uploads with a safe generated filename.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdir(UPLOAD_DIR, { recursive: true }, (err) => cb(err, UPLOAD_DIR));
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIMES[file.mimetype] || path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES[file.mimetype]) {
      return cb(new Error("Only JPEG, PNG or WebP images are allowed"));
    }
    cb(null, true);
  },
});

// POST /api/admin/products/:id/image  (multipart/form-data, field: image)
// Stores the file and points the product's image_url at it.
router.post("/products/:id/image", requireAuth, requireAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file uploaded" });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  const { rows } = await pool.query(
    `UPDATE products SET image_url = $1 WHERE id = $2 RETURNING id, slug, image_url`,
    [imageUrl, req.params.id]
  );
  if (rows.length === 0) {
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: "Could not find a product with that id" });
  }
  res.json({ product: rows[0] });
});

module.exports = router;
