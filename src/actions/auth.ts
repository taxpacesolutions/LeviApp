"use server";

import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase/server";
import { endParentSession } from "@/lib/parent-session";
import { missingEnv } from "@/lib/env";
import type { ActionResult } from "@/lib/types";

export async function signIn(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  if (missingEnv().length) return { ok: false, message: "The app is not configured yet. See the README." };
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "Enter your email and password." };

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "That email or password didn't work." };
  redirect("/kid");
}

export async function signOut() {
  await endParentSession();
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** True until the first parent account has been created and linked. */
export async function needsFirstAccount(): Promise<boolean> {
  if (missingEnv().length) return false;
  const { db } = await import("@/lib/supabase/admin");
  const { count } = await db()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "parent")
    .not("auth_user_id", "is", null);
  return count === 0;
}

/**
 * First-run only: creates the family's login (no Supabase dashboard needed).
 * Refuses as soon as any parent account is linked, so it can't be reused later.
 */
export async function createFirstAccount(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!(await needsFirstAccount())) return { ok: false, message: "This family already has an account. Please sign in." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "That email doesn't look right." };
  if (password.length < 8) return { ok: false, message: "Use a password with at least 8 characters." };
  if (password !== String(fd.get("confirm") ?? "")) return { ok: false, message: "The passwords don't match." };
  const allowed = (process.env.ALLOWED_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(email)) return { ok: false, message: "That email isn't allowed for this app." };

  const { db } = await import("@/lib/supabase/admin");
  const { error } = await db().auth.admin.createUser({ email, password, email_confirm: true });
  if (error && !/already/i.test(error.message)) {
    console.error("[createFirstAccount]", error);
    return { ok: false, message: "Couldn't create the account. Please try again." };
  }
  const supabase = await authClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { ok: false, message: "Account created, but signing in failed. Try signing in." };
  redirect("/kid"); // the first sign-in links this account to the family
}
