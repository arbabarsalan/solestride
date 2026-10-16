// Pure query builder for the public product catalog listing.
// Kept free of database calls so pagination, filtering, and sorting
// rules can be unit tested without PostgreSQL running.

const SORT_OPTIONS = {
  newest: "p.created_at DESC",
  price_asc: "p.price_cents ASC",
  price_desc: "p.price_cents DESC",
  name_asc: "p.name ASC",
};

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

// Returns the fallback when the option is absent, and undefined when it is
// present but invalid, so callers can tell "no filter" apart from "bad input".
function parseInteger(value, { min, max, fallback = null }) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return undefined;
  return n;
}

/**
 * Turns request options into a safe, parameterized pair of SQL statements
 * (one page of rows + the matching count). Returns { error } when any
 * option is out of range instead of silently clamping, so callers can
 * answer 400.
 */
function buildProductListQuery(options = {}) {
  const page = parseInteger(options.page, { min: 1, max: 10000, fallback: 1 });
  if (page === undefined) return { error: "page must be an integer between 1 and 10000" };

  const limit = parseInteger(options.limit, {
    min: 1,
    max: MAX_PAGE_SIZE,
    fallback: DEFAULT_PAGE_SIZE,
  });
  if (limit === undefined) return { error: `limit must be an integer between 1 and ${MAX_PAGE_SIZE}` };

  const minPrice = parseInteger(options.minPrice, { min: 0, max: 100000000, fallback: null });
  if (minPrice === undefined) return { error: "minPrice must be a non-negative integer (paisa)" };

  const maxPrice = parseInteger(options.maxPrice, { min: 0, max: 100000000, fallback: null });
  if (maxPrice === undefined) return { error: "maxPrice must be a non-negative integer (paisa)" };
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { error: "minPrice cannot be greater than maxPrice" };
  }

  const sort = options.sort === undefined || options.sort === "" ? "newest" : options.sort;
  if (!SORT_OPTIONS[sort]) {
    return { error: `sort must be one of: ${Object.keys(SORT_OPTIONS).join(", ")}` };
  }

  let search = null;
  if (options.search !== undefined && options.search !== null && options.search !== "") {
    search = String(options.search).trim();
    if (search.length > 100) return { error: "search must be at most 100 characters" };
  }

  let category = null;
  if (options.category !== undefined && options.category !== null && options.category !== "") {
    category = String(options.category).trim();
    if (!/^[a-z0-9-]{1,60}$/.test(category)) return { error: "category must be a slug (a-z, 0-9, dashes)" };
  }

  const conditions = ["p.is_active = true"];
  const params = [];

  if (category !== null) {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (search !== null) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.brand ILIKE $${params.length})`);
  }
  if (minPrice !== null) {
    params.push(minPrice);
    conditions.push(`p.price_cents >= $${params.length}`);
  }
  if (maxPrice !== null) {
    params.push(maxPrice);
    conditions.push(`p.price_cents <= $${params.length}`);
  }

  const where = conditions.join(" AND ");
  const offset = (page - 1) * limit;

  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const sql = `
    SELECT p.id, p.name, p.slug, p.brand, p.description, p.price_cents, p.currency,
           p.sizes, p.colors, p.stock, p.image_url,
           c.slug AS category_slug, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${where}
    ORDER BY ${SORT_OPTIONS[sort]}
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  // countSql must bind only the filter params, never the page params.
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE ${where}
  `;

  return { sql, countSql, filterParams: params.slice(0, params.length - 2), params, page, limit, offset, sort };
}

module.exports = { buildProductListQuery, SORT_OPTIONS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
