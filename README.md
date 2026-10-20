# SoleStride

A full-stack e-commerce store for shoes, built to production standards.

- **Backend:** Node.js, Express, PostgreSQL, JWT authentication
- **Frontend:** React (Vite), Tailwind CSS
- **Features:** product catalog, cart, checkout, orders, payments (Stripe test mode + cash on delivery), and a complete admin portal (products, categories, orders, dashboard stats)

Built in small, readable commits; see the commit history for the order things were added.
## Backend

The API lives in `server/`. To run it locally you need Node.js 20+ and a PostgreSQL database.

```bash
cd server
cp .env.example .env   # fill in your own values
npm install
npm run migrate
npm run seed           # optional: 5 categories + 20 demo products
npm run dev
```

The server listens on `PORT` (default 5000) and serves the product images from `public/`.

### API

**Auth** (JWT bearer token; customers and admins share the same routes, admin routes check the role):

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

**Catalog** (public):

- `GET /api/products` with `page`, `per_page`, `category`, `brand`, `min_price`, `max_price`, `sort` and pagination metadata
- `GET /api/products/:slug`, `GET /api/categories`

**Cart and checkout** (requires auth):

- `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:id`, `DELETE /api/cart/items/:id`
- `POST /api/checkout/quote` returns item count and subtotal, shipping and total for an address

**Orders and payments** (requires auth):

- `POST /api/orders` creates the order from the cart in one transaction (stock is checked and decremented, cart cleared); body takes the address fields and `payment_method: cod | stripe`
- `GET /api/orders`, `GET /api/orders/:id`
- `POST /api/payments/stripe/intent` creates a PKR PaymentIntent for an order (Stripe test mode only)
- `POST /api/payments/stripe/webhook` marks the payment and the order paid on `payment_intent.succeeded`

**Admin** (requires the admin role):

- Product CRUD with image upload (`POST /api/admin/products/:id/image`), category management
- `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id/status` (`pending | paid | shipped | delivered | cancelled`)

### Tests

```bash
npm test   # unit tests for pricing, product queries and order creation
```
