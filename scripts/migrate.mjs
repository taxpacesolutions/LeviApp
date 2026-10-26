// Runs before `next build`. Keeps the database up to date automatically:
//  * first deploy: creates the tables, the picture bucket and the sample data
//  * later deploys: applies only the migration files that haven't run yet
// Uses the direct Postgres URL that Vercel's Supabase integration provides.
import { readdirSync, readFileSync } from "node:fs";
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

const dir = new URL("../supabase/migrations/", import.meta.url);
const sql = (name) => readFileSync(new URL(name, dir), "utf8");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const BASE = ["20261006000001_schema.sql", "20261006000002_storage.sql"]; // what the first version created
const one = async (q, params) => (await client.query(q, params)).rows[0];

try {
  await client.connect();
  await client.query("begin");
  await client.query("select pg_advisory_xact_lock(724513)"); // two deploys at once wait for each other
  await client.query("create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())");
  await client.query("alter table public._migrations enable row level security");
  await client.query("revoke all on public._migrations from anon, authenticated");

  const applied = new Set((await client.query("select name from public._migrations")).rows.map((r) => r.name));
  const tablesExist = (await one("select to_regclass('public.transactions') is not null as ok")).ok;
  const hasStorage = (await one("select to_regclass('storage.buckets') is not null as ok")).ok;

  if (!tablesExist) {
    console.log("[migrate] First deploy: creating tables and sample data…");
    for (const f of BASE) if (f.includes("schema") || hasStorage) await client.query(sql(f));
    await client.query(readFileSync(new URL("../seed.sql", dir), "utf8"));
  }
  if (!tablesExist || applied.size === 0) {
    // Databases set up before this table existed already have the base files.
    for (const f of BASE) await client.query("insert into public._migrations (name) values ($1) on conflict do nothing", [f]);
    BASE.forEach((f) => applied.add(f));
  }

  for (const f of files) {
    if (applied.has(f)) continue;
    if (f.includes("storage") && !hasStorage) continue;
    console.log(`[migrate] Applying ${f}…`);
    await client.query(sql(f));
    await client.query("insert into public._migrations (name) values ($1)", [f]);
  }
  await client.query("commit");
  console.log("[migrate] Database is up to date.");
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("[migrate] Setup failed:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
