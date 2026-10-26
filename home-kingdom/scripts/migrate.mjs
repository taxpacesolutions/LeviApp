// Runs before `vite build`. On the first deploy it creates the Home Kingdom
// tables, security rules and starting quests. Later deploys see the tables
// already exist and skip that part.
//
// It also stores which email belongs to which hero when HK_JESSICA_EMAIL /
// HK_MARIANO_EMAIL are set.
//
// Needs a direct Postgres URL (Vercel's Supabase integration provides one).
// Without it nothing happens and you run the SQL files by hand (see README).
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.log("[home-kingdom] No database URL set; skipping automatic setup (see README → Configure Supabase).");
  process.exit(0);
}

// Supabase serves its own certificate chain; strip sslmode so the setting below applies.
const clean = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
const local = /localhost|127\.0\.0\.1|\/var\/|\/tmp\//.test(clean);
const client = new pg.Client({ connectionString: clean, ssl: local ? false : { rejectUnauthorized: false } });
const file = (p) => readFileSync(new URL(`../supabase/${p}`, import.meta.url), "utf8");

try {
  await client.connect();
  const { rows } = await client.query("select to_regclass('public.hk_households') is not null as ready");
  if (rows[0].ready) {
    console.log("[home-kingdom] Database already set up.");
  } else {
    console.log("[home-kingdom] First deploy: creating tables and starting quests…");
    await client.query("begin");
    await client.query(file("migrations/001_home_kingdom.sql"));
    await client.query(file("seed.sql"));
    await client.query("commit");
    console.log("[home-kingdom] Done.");
  }
  for (const [hero, email] of [
    ["jessica", process.env.HK_JESSICA_EMAIL],
    ["mariano", process.env.HK_MARIANO_EMAIL],
  ]) {
    if (email && email.includes("@")) {
      await client.query("select public.hk_set_hero_email($1, $2)", [hero, email]);
      console.log(`[home-kingdom] ${hero}'s login email is set.`);
    }
  }
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("[home-kingdom] Database setup failed:", e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
