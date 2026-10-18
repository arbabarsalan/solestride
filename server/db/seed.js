// Seeds the SoleStride catalog with realistic demo data.
// Idempotent: safe to run more than once, existing rows are left alone.
// Run after migrations:  npm run seed
require("dotenv").config();
const pool = require("../src/db/pool");

const categories = [
  { name: "Sneakers", slug: "sneakers", description: "Everyday lace-ups built for comfort and clean style." },
  { name: "Running", slug: "running", description: "Lightweight shoes made for pace and long distances." },
  { name: "Formal", slug: "formal", description: "Leather classics that finish an office or event look." },
  { name: "Boots", slug: "boots", description: "Sturdy pairs for winter, work, and rough weather." },
  { name: "Sandals", slug: "sandals", description: "Breathing open footwear for warm days." },
];

// Prices are integer paisa (PKR). Sizes are UK sizes.
const products = [
  // Sneakers
  ["Court Classic Low", "sneakers", "SoleStride", "A minimal white leather sneaker with a vulcanised rubber sole. Goes with everything and stays comfortable all day.", 890000, [6,7,8,9,10,11], ["white","black"]],
  ["Retro Canvas High", "sneakers", "Driftline", "High-top canvas sneaker with a padded collar and a vintage gum sole. Light enough for summer, tough enough for daily wear.", 620000, [6,7,8,9,10], ["olive","navy","black"]],
  ["Suede Street Court", "sneakers", "Kestrel", "Soft suede upper on a cushioned midsole. A quiet, premium take on the classic court silhouette.", 1150000, [7,8,9,10,11], ["beige","grey"]],
  ["Mesh Breeze Slip-On", "sneakers", "SoleStride", "Breathable knit slip-on with a memory foam footbed. Laceless convenience without looking casual.", 540000, [6,7,8,9,10,11], ["grey","charcoal"]],
  ["Court Classic Mid", "sneakers", "SoleStride", "The Court Classic raised to a mid cut, with ankle padding and a slightly chunkier sole.", 980000, [7,8,9,10], ["white","sand"]],

  // Running
  ["Aero Pace Runner", "running", "Kestrel", "Featherweight mesh runner with responsive foam. Built for tempo runs and daily mileage alike.", 1450000, [6,7,8,9,10,11,12], ["coral","blue","black"]],
  ["TrailGrip Outlast", "running", "Northward", "Aggressive outsole lugs and a rock plate for gravel trails and loose terrain.", 1680000, [7,8,9,10,11], ["moss","slate"]],
  ["Cloudstep Daily", "running", "Driftline", "A forgiving cushioned trainer for easy runs and long walks. Wide toe box, zero break-in.", 1290000, [6,7,8,9,10,11], ["white","teal"]],
  ["Sprint Flats Lite", "running", "Kestrel", "Minimal low-drop racing flat for shorter distances and track sessions.", 1120000, [6,7,8,9,10], ["yellow","black"]],

  // Formal
  ["Heritage Oxford", "formal", "Valeroot", "Hand-finished leather oxford with a stitched welt sole. The one black pair every wardrobe needs.", 2450000, [6,7,8,9,10,11], ["black","dark brown"]],
  ["Derby Day Leather", "formal", "Valeroot", "A roomier derby cut in polished leather. Comfortable enough for a full office day.", 1980000, [7,8,9,10,11], ["tan","black"]],
  ["Monk Strap Signature", "formal", "Valeroot", "Single monk strap in burnished leather. Sharp for weddings and client meetings.", 2200000, [7,8,9,10], ["cognac","black"]],
  ["Loafer Lounge Suede", "formal", "Driftline", "Soft suede penny loafer that dresses up denim as easily as it does trousers.", 1650000, [6,7,8,9,10,11], ["taupe","navy"]],

  // Boots
  ["Workman Lace Boot", "boots", "Northward", "Full-grain leather boot with a steel-shank sole. Built for long shifts and rough ground.", 2890000, [7,8,9,10,11], ["brown","black"]],
  ["Winter Ridge Boot", "boots", "Northward", "Insulated, water-resistant boot with a grippy winter outsole. Warm down to freezing mornings.", 3350000, [7,8,9,10,11], ["walnut","charcoal"]],
  ["Chelsea Urban Boot", "boots", "Kestrel", "Sleek pull-on Chelsea boot with elastic side panels. Office on Monday, dinner on Friday.", 2100000, [6,7,8,9,10,11], ["black","chestnut"]],
  ["Desert Chukka", "boots", "Valeroot", "Crepe-sole chukka in smooth suede. A relaxed boot that works with jeans or chinos.", 1870000, [7,8,9,10,11], ["sand","espresso"]],

  // Sandals
  ["Coast Slide Sandal", "sandals", "SoleStride", "Contoured footbed slide with soft padded straps. Holiday comfort that lasts past the holiday.", 320000, [6,7,8,9,10,11], ["tan","black"]],
  ["TrailSport Flip", "sandals", "Northward", "Cushioned flip-flop with a non-slip outsole, made for beach walks and hostel floors.", 210000, [6,7,8,9,10,11], ["blue","grey"]],
  ["Leather Kolhapuri", "sandals", "Valeroot", "Hand-stitched leather kolhapuri with a traditional braid. Breathable and built to age well.", 1450000, [6,7,8,9,10,11], ["mustard","maroon"]],
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
    for (const [name, catSlug, brand, description, priceCents, sizes, colors] of products) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const result = await client.query(
        `INSERT INTO products (category_id, name, slug, brand, description, price_cents, sizes, colors, stock, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
         ON CONFLICT (slug) DO NOTHING`,
        [catId[catSlug], name, slug, brand, description, priceCents, JSON.stringify(sizes), JSON.stringify(colors), 40, `/assets/${slug}.jpg`]
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
