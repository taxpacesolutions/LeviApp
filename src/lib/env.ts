import { createHash } from "node:crypto";

// Names set by hand (.env.local) or by Vercel's Supabase integration, which
// fills NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY and friends automatically.
const read = (...names: string[]) => names.map((n) => process.env[n]).find(Boolean) ?? "";

const supabaseUrl = () => read("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
const supabaseAnonKey = () =>
  read("NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY");
const serviceRoleKey = () => read("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");

export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!serviceRoleKey()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  const secret = process.env.PARENT_SESSION_SECRET;
  if (secret && secret.length < 32) missing.push("PARENT_SESSION_SECRET (must be at least 32 characters)");
  return missing;
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  serviceRoleKey,
  /**
   * Signs the Parent Mode cookie. Uses PARENT_SESSION_SECRET when set; otherwise
   * a key derived from the (server-only) service role key, so a one-click
   * deploy needs no extra setting.
   */
  parentSessionSecret: () =>
    process.env.PARENT_SESSION_SECRET ||
    createHash("sha256").update("lrb-parent-session:" + serviceRoleKey()).digest("hex"),
  /** Optional comma-separated allow-list of emails that may use the app. */
  allowedEmails: () =>
    (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
};
