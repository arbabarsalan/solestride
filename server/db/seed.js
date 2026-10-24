// Seeds the LIBAS catalog with realistic demo data.
// Idempotent: safe to run more than once, existing rows are left alone.
// Run after migrations:  npm run seed
require("dotenv").config();
const pool = require("../src/db/pool");

const categories = [
  { name: "Men", slug: "men", description: "Kurtas, kameez shalwar, and waistcoat sets stitched for every occasion." },
  { name: "Women", slug: "women", description: "Lawn, chiffon, and everyday kurtis, from workdays to weddings." },
  { name: "Kids", slug: "kids", description: "Little fits for big occasions, sized 2 to 12 years." },
  { name: "Unstitched", slug: "unstitched", description: "Fabric by the suit, ready for your tailor." },
  { name: "Accessories", slug: "accessories", description: "Shawls, scarves, and the finishing touches." },
];

// Prices are integer paisa (PKR). Sizes are clothing sizes.
const products = [
  // Men
  ["Classic Kurta — Off-White", "men", "A breathable cotton kurta with a mandarin collar and tonal buttons. Cut relaxed through the chest, falls just right over shalwar or jeans.", 485000, ["S","M","L","XL","XXL"], ["off-white"], 48],
  ["Premier Kurta — Deep Navy", "men", "Premium blended fabric with a subtle sheen, finished with contrast piping along the collar and placket. Made for Eid dinners, engagements, and everything formal.", 745000, ["S","M","L","XL"], ["navy"], 40],
  ["Kameez Shalwar — Sand", "men", "Classic two-piece kameez shalwar in soft-washed sand cotton. Lightweight enough for summer afternoons, sharp enough for Friday prayers.", 525000, ["S","M","L","XL","XXL"], ["sand"], 52],
  ["Waistcoat Kurta Set — Olive", "men", "Embroidered waistcoat layered over a solid kurta, sold as a set. The waistcoat carries light threadwork on the collar; pair it with a plain shalwar.", 980000, ["S","M","L","XL"], ["olive"], 30],
  ["Cotton Panjabi — Charcoal", "men", "Straight-cut panjabi with full sleeves and a clean placket. Charcoal cotton that survives weekly washes and keeps its colour.", 425000, ["S","M","L","XL","XXL"], ["charcoal"], 55],
  ["Designer Kurta — Ivory Embroidered", "men", "Statement kurta with hand-guided embroidery across the neckline. Ivory-on-ivory thread keeps it quiet; the cut does the talking.", 1150000, ["S","M","L","XL"], ["ivory"], 22],

  // Women
  ["Lawn 3-Piece — Emerald Bloom", "women", "Printed lawn shirt with dyed-to-match trousers and a chiffon dupatta. Soft, breathable, and built to last the whole season.", 695000, ["S","M","L","XL"], ["emerald"], 45],
  ["Embroidered Kurta — Blush", "women", "Straight-fit kurta in blush pink with resham embroidery along the neckline. Wear it with trousers for work or with a dupatta for evenings.", 545000, ["S","M","L","XL"], ["blush"], 38],
  ["Chiffon Party Suit — Midnight", "women", "Three-piece formal in midnight chiffon with sequin border work. Falls fluidly, photographs beautifully, and earns its place in the wardrobe.", 1450000, ["S","M","L","XL"], ["midnight"], 18],
  ["Cotton 2-Piece — Ivory", "women", "Everyday two-piece in breathable ivory cotton with minimal block print at the hem. The one you will reach for on busy mornings.", 425000, ["S","M","L","XL"], ["ivory"], 50],
  ["Fancy Maxi — Maroon Velvet", "women", "Floor-length maxi in maroon velvet with a gold-foil print yoke. Winter weddings sorted.", 1250000, ["S","M","L"], ["maroon"], 20],
  ["Printed Kurti — Teal", "women", "Short printed kurti in teal with a straight silhouette. Works over jeans, tights, or trousers without a second thought.", 345000, ["S","M","L","XL","XXL"], ["teal"], 60],

  // Kids
  ["Boys Kurta — White", "kids", "Crisp white cotton kurta for the little gentleman. Machine washable, because we know.", 225000, ["2-3Y","4-5Y","6-7Y","8-9Y","10-12Y"], ["white"], 42],
  ["Girls Frock — Peach Bloom", "kids", "Tiered frock in peach georgette with a satin waistband. Twirl-tested and approved.", 345000, ["2-3Y","4-5Y","6-7Y","8-9Y"], ["peach"], 35],
  ["Kids Shalwar Kameez Set — Sage", "kids", "Matching shalwar kameez set in soft sage cotton, sized for school events and family dinners alike.", 295000, ["2-3Y","4-5Y","6-7Y","8-9Y","10-12Y"], ["sage"], 40],

  // Unstitched
  ["Lawn Unstitched 3-Piece — Bloom", "unstitched", "Two printed lawn shirt pieces with a matching dupatta and trouser fabric. Take it to your darzi and get it made your way.", 595000, ["Unstitched"], ["print"], 44],
  ["Khaddar Unstitched Suit — Charcoal", "unstitched", "Winter-weight khaddar in deep charcoal with self-button detailing. Warm, textured, and ready for the tailor.", 485000, ["Unstitched"], ["charcoal"], 36],
  ["Embroidered Chiffon Unstitched — Rose", "unstitched", "Embroidered chiffon front with plain back and dyed chiffon dupatta. Heavy on the neckline, light everywhere else.", 980000, ["Unstitched"], ["rose"], 25],

  // Accessories
  ["Wool Shawl — Charcoal Weave", "accessories", "Handloom wool shawl with a fine chevron weave and tassel finish. Heavy enough for winter mornings, elegant enough to gift.", 285000, ["Free Size"], ["charcoal"], 46],
  ["Cotton Scarf — Sand", "accessories", "Everyday cotton scarf in soft sand with frayed edges. Doubles as a dupatta when you travel light.", 95000, ["Free Size"], ["sand"], 64],
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [c.name, c.slug, c.description]
      );
    }

    const { rows: catRows } = await client.query("SELECT id, slug FROM categories");
    const catId = Object.fromEntries(catRows.map((r) => [r.slug, r.id]));

    let inserted = 0;
    for (const [name, catSlug, description, priceCents, sizes, colors, stock] of products) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const result = await client.query(
        `INSERT INTO products (category_id, name, slug, brand, description, price_cents, sizes, colors, stock, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
         ON CONFLICT (slug) DO NOTHING`,
        [catId[catSlug], name, slug, "LIBAS", description, priceCents, JSON.stringify(sizes), JSON.stringify(colors), stock, `/assets/${slug}.jpg`]
      );
      inserted += result.rowCount;
    }

    await client.query("COMMIT");
    console.log(`seed done: ${categories.length} categories ensured, ${inserted} products inserted`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("seed failed:", err.message);
  process.exit(1);
});
