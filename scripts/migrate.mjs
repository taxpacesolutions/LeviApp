// Runs before `next build`. On the first deploy it creates the database
// tables, the picture bucket and the sample data (Levi, rewards, LEGO goal).
// Later deploys see the tables already exist and skip everything.
// Uses the direct Postgres URL that Vercel's Supabase integration provides.
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] No database URL set; skipping automatic setup (run the SQL files by hand, see README).");
  process.exit(0);
}

// Supabase serves its own certificate chain; strip sslmode so the explicit setting below applies.
const clean = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
const local = /localhost|127\.0\.0\.1|\/var\/|\/tmp\//.test(clean);
const client = new pg.Client({ connectionString: clean, ssl: local ? false : { rejectUnauthorized: false } });

const file = (p) => readFileSync(new URL(`../supabase/${p}`, import.meta.url), "utf8");

try {
  await client.connect();
  const { rows } = await client.query("select to_regclass('public.transactions') is not null as ready");
  if (rows[0].ready) {
    console.log("[migrate] Database already set up.");
  } else {
    console.log("[migrate] First deploy: creating tables and sample data…");
    await client.query("begin");
    await client.query(file("migrations/20261006000001_schema.sql"));
    const hasStorage = (await client.query("select to_regclass('storage.buckets') is not null as ok")).rows[0].ok;
    if (hasStorage) await client.query(file("migrations/20261006000002_storage.sql"));
    await client.query(file("seed.sql"));
    await client.query("commit");
    console.log("[migrate] Done.");
  }
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("[migrate] Setup failed:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
