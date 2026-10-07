import { db } from "@/lib/supabase/admin";
import { missingEnv } from "@/lib/env";

// Called once a day by a Vercel Cron Job (see vercel.json). A tiny query keeps
// the free Supabase project from pausing when the app isn't opened for a week.
// Returns no family data.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (missingEnv().length) return Response.json({ ok: false, reason: "not configured" }, { status: 503 });
  const { error } = await db().from("families").select("id", { head: true, count: "exact" });
  return Response.json({ ok: !error }, { status: error ? 500 : 200 });
}
