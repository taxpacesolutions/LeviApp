const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PARENT_SESSION_SECRET",
] as const;

export function missingEnv(): string[] {
  const missing: string[] = REQUIRED.filter((k) => !process.env[k]);
  const secret = process.env.PARENT_SESSION_SECRET;
  if (secret && secret.length < 32) missing.push("PARENT_SESSION_SECRET (must be at least 32 characters)");
  return missing;
}

export const env = {
  supabaseUrl: () => process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  serviceRoleKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  parentSessionSecret: () => process.env.PARENT_SESSION_SECRET ?? "",
  /** Optional comma-separated allow-list of emails that may use the app. */
  allowedEmails: () =>
    (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
};
