require("dotenv").config();
const express = require("express");
const path = require("path");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const adminRoutes = require("./routes/admin");
const adminOrderRoutes = require("./routes/adminOrders");
const cartRoutes = require("./routes/cart");
const checkoutRoutes = require("./routes/checkout");
const paymentRoutes = require("./routes/payments");
const stripe = require("./lib/stripe");

const app = express();

// Stripe webhooks need the raw body for signature verification, so the
// payments router mounts before the JSON parser and parses each route itself.
app.use("/api/payments", paymentRoutes);
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    payments: { online_configured: stripe.configured() },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminOrderRoutes.router);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", require("./routes/orders"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`libas server listening on port ${PORT}`);
});

// Central error handler: multer rejections and anything unexpected come back as JSON.
app.use((err, _req, res, _next) => {
  const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  res.status(status).json({ error: err.message || "Request failed" });
});
