// Stripe test-mode client. The keys live in .env as placeholders; the store
// never charges a real card in this build. A lazy client keeps the app
// bootable (and the COD flow usable) without any Stripe configuration.
const Stripe = require("stripe");

let client = null;

function configured() {
  const key = process.env.STRIPE_SECRET_KEY;
  return typeof key === "string" && key.startsWith("sk_test_");
}

function get() {
  if (!configured()) return null;
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// Payments table rows we write against each intent.
// provider='stripe', status pending until the webhook says otherwise.
module.exports = { get, configured };
