import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = __SUPABASE_URL__;
export const configured = Boolean(__SUPABASE_URL__ && __SUPABASE_ANON_KEY__);

export const supabase = createClient(
  __SUPABASE_URL__ || "https://example.invalid",
  __SUPABASE_ANON_KEY__ || "missing",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
