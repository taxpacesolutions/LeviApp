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
