require("dotenv").config();
const express = require("express");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`solestride server listening on port ${PORT}`);
});
