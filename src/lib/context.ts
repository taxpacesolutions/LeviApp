import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/supabase/admin";
import { authClient } from "@/lib/supabase/server";
import { env, missingEnv } from "@/lib/env";
import { hasParentSession } from "@/lib/parent-session";
import type { Profile, Settings } from "@/lib/types";

export const CHILD_COOKIE = "lrb_child";

export interface FamilyContext {
  user: User;
  parent: Profile;
  familyId: string;
  familyName: string;
  settings: Settings;
  children: Profile[];
  /** The child currently being viewed (Levi today; more kids later). */
  child: Profile;
}

export class ParentLockedError extends Error {
  constructor() {
    super("Parent Mode is locked. Please enter your PIN again.");
  }
}

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

type LoadResult = { ok: true; ctx: FamilyContext } | { ok: false; reason: "setup" | "login" | "no-family" | "no-child" };

const loadContext = cache(async (): Promise<LoadResult> => {
  // Reading cookies first makes every page that uses this render per request (never prerendered).
  const cookieStore = await cookies();
  if (missingEnv().length) return { ok: false, reason: "setup" };
  const user = await getUser();
  if (!user) return { ok: false, reason: "login" };

  const allowed = env.allowedEmails();
  if (allowed.length && !allowed.includes((user.email ?? "").toLowerCase())) {
    return { ok: false, reason: "no-family" };
  }

  const sb = db();
  let { data: parent } = await sb.from("profiles").select("*").eq("auth_user_id", user.id).maybeSingle<Profile>();
  if (!parent) {
    // First sign-in: link this account to an unclaimed parent profile (e.g. the seeded "Mom").
    const { data } = await sb.rpc("claim_parent_profile", { p_auth_user_id: user.id, p_email: user.email ?? "" });
    parent = (data as Profile | null)?.id ? (data as Profile) : null;
  }
  if (!parent || parent.role !== "parent" || !parent.active) return { ok: false, reason: "no-family" };

  const [{ data: settings }, { data: family }, { data: children }] = await Promise.all([
    sb
      .from("settings")
      .select("family_id, pin_is_default, parent_title, timezone, parent_session_minutes, earn_presets, streak_categories")
      .eq("family_id", parent.family_id)
      .single<Settings>(),
    sb.from("families").select("name").eq("id", parent.family_id).single<{ name: string }>(),
    sb
      .from("profiles")
      .select("*")
      .eq("family_id", parent.family_id)
      .eq("role", "child")
      .eq("active", true)
      .order("sort_order")
      .returns<Profile[]>(),
  ]);
  if (!settings) return { ok: false, reason: "no-family" };
  if (!children?.length) return { ok: false, reason: "no-child" };

  const wanted = cookieStore.get(CHILD_COOKIE)?.value;
  const child = children.find((c) => c.id === wanted) ?? children[0];

  return {
    ok: true,
    ctx: {
      user,
      parent,
      familyId: parent.family_id,
      familyName: family?.name ?? "Our Family",
      settings,
      children,
      child,
    },
  };
});

/** For pages: returns the family context or redirects somewhere helpful. */
export async function getFamilyContext(): Promise<FamilyContext> {
  const r = await loadContext();
  if (r.ok) return r.ctx;
  if (r.reason === "setup") redirect("/setup");
  if (r.reason === "login") redirect("/login");
  redirect(`/setup?reason=${r.reason}`);
}

/** For parent pages: also requires a valid PIN session. */
export async function getParentContext(): Promise<FamilyContext> {
  const ctx = await getFamilyContext();
  if (!(await hasParentSession(ctx.user.id, ctx.familyId))) redirect("/parent/unlock");
  return ctx;
}

/** For Server Actions: throws instead of redirecting. */
export async function familyActionContext(): Promise<FamilyContext> {
  const r = await loadContext();
  if (!r.ok) throw new Error("Please sign in again.");
  return r.ctx;
}

export async function parentActionContext(): Promise<FamilyContext> {
  const ctx = await familyActionContext();
  if (!(await hasParentSession(ctx.user.id, ctx.familyId))) throw new ParentLockedError();
  return ctx;
}
