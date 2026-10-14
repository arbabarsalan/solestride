require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../src/db/pool");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function runMigrations() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS migrations (
       id SERIAL PRIMARY KEY,
       filename TEXT NOT NULL UNIQUE,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );

  const { rows } = await pool.query("SELECT filename FROM migrations");
  const applied = new Set(rows.map((r) => r.filename));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO migrations (filename) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`apply ${file}`);
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }

  await pool.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
