// Vercel serverless function: push notifications for Home Kingdom.
//
//   GET  /api/push                       → { publicKey } (needed to subscribe)
//   POST /api/push { action: "subscribe", subscription, tz }
//   POST /api/push { action: "unsubscribe", endpoint }
//   POST /api/push { action: "notify", event, id }
//
// Every POST needs the signed-in user's Supabase token. For "notify" the
// server looks up the real row, checks the caller caused it, writes the text
// itself, and sends it only to the *other* hero. Each event is sent once and
// never during quiet hours (23:00–08:00 in the receiver's time zone).
import pg from "pg";
import webpush from "web-push";

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type Res = { status: (n: number) => Res; json: (o: unknown) => void; setHeader: (k: string, v: string) => void };
type Lang = "es" | "en";
type Profile = { id: string; household_id: string; hero: string; display_name: string; lang: Lang };
type Msg = { title: string; body: string; url: string };

const QUIET_START = 23;
const QUIET_END = 8;

let pool: pg.Pool | null = null;
function db() {
  if (!pool) {
    const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
    const clean = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
    const local = /localhost|127\.0\.0\.1|\/var\/|\/tmp\//.test(clean);
    pool = new pg.Pool({ connectionString: clean, ssl: local ? false : { rejectUnauthorized: false }, max: 2 });
  }
  return pool;
}
const q = async <T>(sql: string, args: unknown[] = []) => (await db().query(sql, args)).rows as T[];

async function setting(key: string) {
  return (await q<{ value: string }>("select value from public.hk_private_settings where key = $1", [key]))[0]?.value;
}

// Who is calling? Asks Supabase to confirm the token, then finds their hero.
async function caller(req: Req): Promise<Profile | null> {
  const auth = String(req.headers.authorization ?? "");
  const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (!auth.startsWith("Bearer ") || !base) return null;
  const r = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: auth, apikey: key } });
  if (!r.ok) return null;
  const user = (await r.json()) as { id?: string };
  if (!user.id) return null;
  return (await q<Profile>(
    "select id, household_id, hero, display_name, lang from public.hk_profiles where user_id = $1", [user.id]))[0] ?? null;
}

const T = {
  es: {
    reward_request: (n: string, t: string) => ({ title: "🎁 Recompensa por aprobar", body: `${n} te pide: ${t}` }),
    approved: (n: string, t: string) => ({ title: "✅ ¡Aprobada!", body: `${n} aprobó: ${t}` }),
    declined: (n: string, t: string) => ({ title: "Recompensa", body: `${n} dijo «no esta vez» a: ${t}` }),
    help: (n: string, b: string) => ({ title: `🔨 ${n} pide ayuda`, body: b }),
    question: (n: string, b: string) => ({ title: `❓ ${n} te pregunta`, body: b }),
    appreciation: (n: string, b: string) => ({ title: `💛 ${n} te dejó un agradecimiento`, body: b }),
    quest_done: (t: string) => ({ title: "🏆 ¡Misión completada!", body: t }),
    unlock: (t: string, u: string) => ({ title: "🏆 ¡Misión completada!", body: `${t} · Nuevo en el reino` + (u ? `: ${u}` : "") }),
  },
  en: {
    reward_request: (n: string, t: string) => ({ title: "🎁 Reward to approve", body: `${n} asks: ${t}` }),
    approved: (n: string, t: string) => ({ title: "✅ Approved!", body: `${n} approved: ${t}` }),
    declined: (n: string, t: string) => ({ title: "Reward", body: `${n} said “not this time” to: ${t}` }),
    help: (n: string, b: string) => ({ title: `🔨 ${n} asks for help`, body: b }),
    question: (n: string, b: string) => ({ title: `❓ ${n} has a question`, body: b }),
    appreciation: (n: string, b: string) => ({ title: `💛 ${n} left you a thank-you`, body: b }),
    quest_done: (t: string) => ({ title: "🏆 Quest complete!", body: t }),
    unlock: (t: string, u: string) => ({ title: "🏆 Quest complete!", body: `${t} · New in the kingdom` + (u ? `: ${u}` : "") }),
  },
};
const UNLOCK_NAMES: Record<string, Record<Lang, string>> = {
  workshop: { es: "Taller y oficina", en: "Workshop & office" }, garden: { es: "Jardín de flores", en: "Flower garden" },
  door: { es: "Puerta nueva", en: "New door" }, window_boxes: { es: "Jardineras", en: "Window boxes" },
  welcome_mat: { es: "Entrada acogedora", en: "Cozy entrance" }, banner: { es: "Estandarte del hogar", en: "Home banner" },
  tool_rack: { es: "Banco de herramientas", en: "Tool bench" }, cart: { es: "Carreta", en: "Cart" },
  barn: { es: "Granero", en: "Storage barn" }, lamps: { es: "Faroles", en: "Lamp posts" },
  stone_path: { es: "Camino de piedra", en: "Stone path" }, wide_road: { es: "Camino ancho", en: "Wide road" },
  deck: { es: "Terraza de madera", en: "Wooden deck" }, fence: { es: "Cerca blanca", en: "Picket fence" },
  chest: { es: "Cofre del tesoro", en: "Treasure chest" },
};
const short = (s: string) => (s.length > 140 ? s.slice(0, 137) + "…" : s);

// Builds the message for `to`, or null if this event isn't something the caller just did.
async function buildMessage(me: Profile, to: Profile, event: string, id: string): Promise<{ msg: Msg; logEvent: string } | null> {
  const L = T[to.lang === "en" ? "en" : "es"];
  if (event === "reward_request") {
    const r = (await q<{ title: string }>(
      "select title from public.hk_redemptions where id = $1 and household_id = $2 and requested_by = $3 and status = 'requested'",
      [id, me.household_id, me.id]))[0];
    return r ? { msg: { ...L.reward_request(me.display_name, r.title), url: "/#/shop/requests" }, logEvent: event } : null;
  }
  if (event === "reward_decided") {
    const r = (await q<{ title: string; status: string; requested_by: string }>(
      "select title, status, requested_by from public.hk_redemptions where id = $1 and household_id = $2 and decided_by = $3 and status in ('approved', 'declined')",
      [id, me.household_id, me.id]))[0];
    if (!r || r.requested_by !== to.id) return null;
    const m = r.status === "approved" ? L.approved(me.display_name, r.title) : L.declined(me.display_name, r.title);
    return { msg: { ...m, url: "/#/shop/requests" }, logEvent: event };
  }
  if (event === "comment") {
    const c = (await q<{ kind: string; body: string; project_id: string | null }>(
      "select kind, body, project_id from public.hk_comments where id = $1 and household_id = $2 and author = $3 and kind in ('help', 'question', 'appreciation')",
      [id, me.household_id, me.id]))[0];
    if (!c) return null;
    const make = L[c.kind as "help" | "question" | "appreciation"];
    return { msg: { ...make(me.display_name, short(c.body)), url: c.project_id ? `/#/quests/${c.project_id}` : "/#/" }, logEvent: event };
  }
  if (event === "quest_done") {
    const p = (await q<{ title: string; unlock_key: string | null }>(
      "select title, unlock_key from public.hk_projects where id = $1 and household_id = $2 and status = 'completed'",
      [id, me.household_id]))[0];
    if (!p) return null;
    const u = p.unlock_key ? UNLOCK_NAMES[p.unlock_key]?.[to.lang === "en" ? "en" : "es"] ?? "" : "";
    const m = p.unlock_key ? L.unlock(p.title, u) : L.quest_done(p.title);
    return { msg: { ...m, url: `/#/quests/${id}` }, logEvent: event };
  }
  return null;
}

function quiet(tz: string, now = new Date()) {
  let hour: number;
  try {
    hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now));
  } catch {
    hour = now.getUTCHours();
  }
  return hour >= QUIET_START || hour < QUIET_END;
}

async function send(to: Profile, msg: Msg) {
  const pub = await setting("vapid_public");
  const priv = await setting("vapid_private");
  if (!pub || !priv) return { sent: 0, reason: "no_keys" };
  const site = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  webpush.setVapidDetails(site ? `https://${site}` : "mailto:home-kingdom@example.com", pub, priv);
  const subs = await q<{ id: string; endpoint: string; p256dh: string; auth: string; tz: string }>(
    "select id, endpoint, p256dh, auth, tz from public.hk_push_subscriptions where profile_id = $1", [to.id]);
  let sent = 0;
  for (const s of subs) {
    if (quiet(s.tz)) continue;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(msg), { TTL: 60 * 60 * 6, urgency: "normal" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // The phone turned notifications off or reinstalled: forget that address.
      if (code === 404 || code === 410) await q("delete from public.hk_push_subscriptions where id = $1", [s.id]);
    }
  }
  return { sent };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: Req, res: Res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") return res.status(200).json({ publicKey: (await setting("vapid_public")) ?? null });
    if (req.method !== "POST") return res.status(405).json({ error: "method" });

    const me = await caller(req);
    if (!me) return res.status(401).json({ error: "unauthorized" });
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {}) as Record<string, unknown>;

    if (body.action === "subscribe") {
      const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
      const tz = typeof body.tz === "string" && body.tz.length < 64 ? body.tz : "UTC";
      if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth || sub.endpoint.length > 1000)
        return res.status(400).json({ error: "bad_subscription" });
      await q(
        `insert into public.hk_push_subscriptions (profile_id, endpoint, p256dh, auth, tz) values ($1, $2, $3, $4, $5)
         on conflict (endpoint) do update set profile_id = excluded.profile_id, p256dh = excluded.p256dh, auth = excluded.auth, tz = excluded.tz`,
        [me.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth, tz]);
      return res.status(200).json({ ok: true });
    }

    if (body.action === "unsubscribe") {
      await q("delete from public.hk_push_subscriptions where endpoint = $1 and profile_id = $2", [String(body.endpoint ?? ""), me.id]);
      return res.status(200).json({ ok: true });
    }

    if (body.action === "notify") {
      const event = String(body.event ?? "");
      const id = String(body.id ?? "");
      if (!UUID.test(id)) return res.status(400).json({ error: "bad_id" });
      const to = (await q<Profile>(
        "select id, household_id, hero, display_name, lang from public.hk_profiles where household_id = $1 and id <> $2",
        [me.household_id, me.id]))[0];
      if (!to) return res.status(200).json({ sent: 0 });
      const built = await buildMessage(me, to, event, id);
      if (!built) return res.status(200).json({ sent: 0, reason: "nothing_to_send" });
      const fresh = await q("insert into public.hk_push_log (event, ref_id) values ($1, $2) on conflict do nothing returning ref_id",
        [built.logEvent, id]);
      if (!fresh.length) return res.status(200).json({ sent: 0, reason: "already_sent" });
      return res.status(200).json(await send(to, built.msg));
    }

    return res.status(400).json({ error: "bad_action" });
  } catch (e) {
    console.error("[push]", (e as Error).message);
    return res.status(500).json({ error: "server" });
  }
}

export { quiet };
