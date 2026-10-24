// Unit tests for the product list query builder. Run: node server/test/productQuery.test.js
const assert = require("assert");
const { buildProductListQuery } = require("../src/lib/productQuery");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("defaults: page 1, limit 12, newest sort", () => {
  const q = buildProductListQuery({});
  assert.strictEqual(q.page, 1);
  assert.strictEqual(q.limit, 12);
  assert.strictEqual(q.sort, "newest");
  assert.strictEqual(q.offset, 0);
  assert.ok(q.sql.includes("p.is_active = true"));
});

check("pagination offset math", () => {
  const q = buildProductListQuery({ page: 3, limit: 10 });
  assert.strictEqual(q.offset, 20);
});

check("filter params bind in order and never into countSql", () => {
  const q = buildProductListQuery({ category: "men", search: "kurta", minPrice: 5000, maxPrice: 20000 });
  assert.deepStrictEqual(q.filterParams, ["men", "%kurta%", 5000, 20000]);
  assert.strictEqual(q.countSql, q.countSql.replace(/\$5|\$6/g, "IMPOSSIBLE"), "count must not bind page params");
  assert.ok(q.sql.includes("c.slug = $1"));
  assert.ok(q.sql.includes("ORDER BY p.created_at DESC"));
});

check("invalid page returns 400-style error", () => {
  assert.ok(buildProductListQuery({ page: 0 }).error);
  assert.ok(buildProductListQuery({ page: 1.5 }).error);
  assert.ok(buildProductListQuery({ page: "abc" }).error);
});

check("invalid limit rejected above cap", () => {
  assert.ok(buildProductListQuery({ limit: 51 }).error);
  assert.strictEqual(buildProductListQuery({ limit: 50 }).limit, 50);
});

check("unknown sort rejected", () => {
  assert.ok(buildProductListQuery({ sort: "DROP TABLE users" }).error);
});

check("bad price range rejected", () => {
  assert.ok(buildProductListQuery({ minPrice: -1 }).error);
  assert.ok(buildProductListQuery({ minPrice: 100, maxPrice: 50 }).error);
});

check("category must be a slug", () => {
  assert.ok(buildProductListQuery({ category: "Shoes; DROP" }).error);
  assert.strictEqual(buildProductListQuery({ category: "winter-shawls" }).filterParams[0], "winter-shawls");
});

check("search is trimmed and parameterized", () => {
  const q = buildProductListQuery({ search: "  air max  " });
  assert.deepStrictEqual(q.filterParams, ["%air max%"]);
});

check("sort whitelist covers price directions", () => {
  assert.strictEqual(buildProductListQuery({ sort: "price_asc" }).sql.includes("p.price_cents ASC"), true);
  assert.strictEqual(buildProductListQuery({ sort: "price_desc" }).sql.includes("p.price_cents DESC"), true);
});

console.log(`\n${passed} tests passed`);
