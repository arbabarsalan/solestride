require("dotenv").config();
const express = require("express");
const path = require("path");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const adminRoutes = require("./routes/admin");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`solestride server listening on port ${PORT}`);
});

// Central error handler: multer rejections and anything unexpected come back as JSON.
app.use((err, _req, res, _next) => {
  const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  res.status(status).json({ error: err.message || "Request failed" });
});
