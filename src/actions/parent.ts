"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { familyActionContext, type FamilyContext } from "@/lib/context";
import { endParentSession, startParentSession } from "@/lib/parent-session";
import {
  assertChild,
  assertOwned,
  bool,
  int,
  parentAction,
  requiredStr,
  rpc,
  str,
  uploadImage,
  UserError,
} from "@/lib/action-utils";
import { categoryInfo, DEDUCT_CATEGORIES, EARN_CATEGORIES } from "@/lib/categories";
import type { ActionResult } from "@/lib/types";

// Everything in this file requires a valid Parent Mode (PIN) session,
// enforced by parentAction() on the server — not just hidden in the UI.

const by = (ctx: FamilyContext) => ({ p_created_by: ctx.parent.id, p_created_by_label: ctx.settings.parent_title });
const decidedBy = (ctx: FamilyContext) => ({ p_decided_by: ctx.parent.id, p_decided_by_label: ctx.settings.parent_title });
const childFrom = (ctx: FamilyContext, fd: FormData) => assertChild(ctx, str(fd, "child_id", 40) || ctx.child.id);

// ---------------------------------------------------------------------------
// PIN
// ---------------------------------------------------------------------------
export async function unlockParent(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  let ctx: FamilyContext;
  try {
    ctx = await familyActionContext();
  } catch {
    return { ok: false, message: "Please sign in again." };
  }
  const pin = String(fd.get("pin") ?? "");
  if (!/^\d{4,8}$/.test(pin)) return { ok: false, message: "Enter your 4–8 digit PIN." };

  let res: { ok: boolean; locked_until?: string; attempts_left?: number };
  try {
    res = await rpc("verify_parent_pin", { p_family_id: ctx.familyId, p_pin: pin });
  } catch (e) {
    console.error("[unlockParent]", e);
    return { ok: false, message: "Couldn't check the PIN. Please try again." };
  }
  if (!res.ok) {
    if (res.locked_until) {
      const mins = Math.max(1, Math.ceil((new Date(res.locked_until).getTime() - Date.now()) / 60000));
      return { ok: false, message: `Too many tries. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
    }
    return { ok: false, message: `Wrong PIN. ${res.attempts_left ?? 0} tries left.` };
  }
  await startParentSession(ctx.user.id, ctx.familyId, ctx.settings.parent_session_minutes);
  redirect("/parent");
}

export async function lockParent() {
  await endParentSession();
  redirect("/kid");
}

export async function changePin(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const current = str(fd, "current", 8);
    const next = str(fd, "new", 8);
    if (next !== str(fd, "confirm", 8)) throw new UserError("The new PINs don't match.");
    if (!/^\d{4,8}$/.test(next)) throw new UserError("PIN must be 4 to 8 digits.");
    const check = await rpc<{ ok: boolean }>("verify_parent_pin", { p_family_id: ctx.familyId, p_pin: current });
    if (!check.ok) throw new UserError("Current PIN is not right.");
    await rpc("set_parent_pin", { p_family_id: ctx.familyId, p_new_pin: next });
    return "PIN changed.";
  });
}

// ---------------------------------------------------------------------------
// Bucks in / out / between buckets
// ---------------------------------------------------------------------------
export async function earnBucks(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const child = childFrom(ctx, fd);
    const category = str(fd, "category", 40);
    if (!EARN_CATEGORIES.some((c) => c.key === category)) throw new UserError("Pick what it was for.");
    const amount = int(fd, "amount", "Amount", { max: 1000 });
    const description = str(fd, "description", 80) || categoryInfo(category).label;
    await rpc("earn_bucks", {
      p_child_id: child.id,
      p_amount: amount,
      p_category: category,
      p_description: description,
      p_note: str(fd, "note", 300) || null,
      p_is_bonus: category === "bonus",
      ...by(ctx),
    });
    return `+${amount} for ${child.display_name} — ${description}`;
  });
}

export async function deductBucks(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const child = childFrom(ctx, fd);
    const cat = DEDUCT_CATEGORIES.find((c) => c.key === str(fd, "category", 40));
    if (!cat) throw new UserError("Pick a reason.");
    const amount = int(fd, "amount", "Amount", { max: 100000 });
    const description = str(fd, "description", 80) || cat.label;
    await rpc("deduct_bucks", {
      p_child_id: child.id,
      p_amount: amount,
      p_category: cat.key,
      p_description: description,
      p_note: str(fd, "note", 300) || null,
      p_as_adjustment: !!cat.adjustment,
      ...by(ctx),
    });
    return `−${amount} from ${child.display_name} — ${description}`;
  });
}

export async function moveBucks(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const child = childFrom(ctx, fd);
    const direction = str(fd, "direction") === "from_savings" ? "from_savings" : "to_savings";
    const amount = int(fd, "amount", "Amount");
    await rpc("transfer_bucks", {
      p_child_id: child.id,
      p_direction: direction,
      p_amount: amount,
      p_note: str(fd, "note", 300) || null,
      ...by(ctx),
    });
    return direction === "to_savings" ? `Moved ${amount} to savings.` : `Moved ${amount} out of savings.`;
  });
}

export async function setBalances(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const child = childFrom(ctx, fd);
    await rpc("set_balances", {
      p_child_id: child.id,
      p_available: int(fd, "available", "Available", { min: 0 }),
      p_savings: int(fd, "savings", "Savings", { min: 0 }),
      p_reason: requiredStr(fd, "reason", "a reason", 300),
      ...by(ctx),
    });
    return "Balances adjusted. An adjustment was added to the history.";
  });
}

export async function reverseTransaction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    await assertOwned("transactions", id, ctx.familyId);
    await rpc("reverse_transaction", { p_transaction_id: id, p_reason: str(fd, "reason", 300) || null, ...by(ctx) });
    return "Reversed. Both entries stay in the history.";
  });
}

export async function correctTransaction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    await assertOwned("transactions", id, ctx.familyId);
    await rpc("correct_transaction", {
      p_transaction_id: id,
      p_new_amount: int(fd, "amount", "Amount"),
      p_new_category: str(fd, "category", 40) || null,
      p_new_description: str(fd, "description", 80) || null,
      p_reason: str(fd, "reason", 300) || null,
      ...by(ctx),
    });
    return "Corrected. The original was reversed and a fixed entry was added.";
  });
}

// ---------------------------------------------------------------------------
// Rewards
// ---------------------------------------------------------------------------
export async function saveReward(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    if (id) await assertOwned("rewards", id, ctx.familyId);
    const image = await uploadImage(fd, "image", ctx.familyId);
    const row: Record<string, unknown> = {
      name: requiredStr(fd, "name", "a name", 60),
      description: str(fd, "description", 200),
      cost: int(fd, "cost", "Cost"),
      icon: str(fd, "icon", 16) || "🎁",
      active: bool(fd, "active"),
      updated_at: new Date().toISOString(),
    };
    if (image) row.image_url = image;
    if (bool(fd, "remove_image")) row.image_url = null;

    const q = id
      ? db().from("rewards").update(row).eq("id", id).eq("family_id", ctx.familyId)
      : db().from("rewards").insert({ ...row, family_id: ctx.familyId });
    const { error } = await q;
    if (error) throw new Error(error.message);
    return id ? "Reward saved." : "Reward created.";
  });
}

export async function toggleReward(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    await assertOwned("rewards", id, ctx.familyId);
    const active = bool(fd, "active");
    await db().from("rewards").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
    return active ? "Reward is in the store." : "Reward hidden from the store.";
  });
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export async function saveGoal(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    const child = childFrom(ctx, fd);
    if (id) await assertOwned("goals", id, ctx.familyId);
    const image = await uploadImage(fd, "image", ctx.familyId);
    const targetDate = str(fd, "target_date", 10);
    const row: Record<string, unknown> = {
      name: requiredStr(fd, "name", "a goal name", 60),
      target_amount: int(fd, "target_amount", "Goal amount"),
      icon: str(fd, "icon", 16) || "🎯",
      target_date: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : null,
      updated_at: new Date().toISOString(),
    };
    const status = str(fd, "status");
    if (id && (status === "active" || status === "paused")) row.status = status;
    if (image) row.image_url = image;
    if (bool(fd, "remove_image")) row.image_url = null;

    if (id) {
      const { error } = await db().from("goals").update(row).eq("id", id).eq("family_id", ctx.familyId);
      if (error) throw new Error(error.message);
      await rpc("refresh_goal_status", { p_goal_id: id });
      return "Goal saved.";
    }
    const { error } = await db().from("goals").insert({ ...row, family_id: ctx.familyId, child_id: child.id });
    if (error) throw new Error(error.message);
    return "Goal created.";
  });
}

export async function setGoalStatus(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    await assertOwned("goals", id, ctx.familyId);
    const status = str(fd, "status");
    if (status !== "active" && status !== "paused") throw new UserError("Unknown status.");
    await db().from("goals").update({ status, updated_at: new Date().toISOString() }).eq("id", id).is("purchased_at", null);
    await rpc("refresh_goal_status", { p_goal_id: id });
    return status === "paused" ? "Goal paused." : "Goal is active again.";
  });
}

export async function addToGoal(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "goal_id", 40);
    await assertOwned("goals", id, ctx.familyId);
    const source = str(fd, "source") === "savings" ? "savings" : "available";
    const amount = int(fd, "amount", "Amount");
    await rpc("contribute_to_goal", {
      p_goal_id: id,
      p_amount: amount,
      p_source: source,
      p_note: str(fd, "note", 300) || null,
      ...by(ctx),
    });
    return `Added ${amount} to the goal.`;
  });
}

export async function takeFromGoal(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "goal_id", 40);
    await assertOwned("goals", id, ctx.familyId);
    const amount = int(fd, "amount", "Amount");
    await rpc("withdraw_from_goal", { p_goal_id: id, p_amount: amount, p_note: str(fd, "note", 300) || null, ...by(ctx) });
    return `${amount} moved back to free savings.`;
  });
}

export async function purchaseGoal(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "goal_id", 40);
    await assertOwned("goals", id, ctx.familyId);
    await rpc("purchase_goal", { p_goal_id: id, ...by(ctx) });
    return "Goal bought! 🎉 The Bucks were spent from savings.";
  });
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------
export async function decideRequest(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    const kind = str(fd, "kind") === "transfer" ? "transfer" : "redemption";
    const approve = str(fd, "decision") === "approve";
    await assertOwned(kind === "transfer" ? "transfer_requests" : "redemption_requests", id, ctx.familyId);
    await rpc(kind === "transfer" ? "decide_transfer" : "decide_redemption", {
      p_request_id: id,
      p_approve: approve,
      p_note: str(fd, "note", 300) || null,
      ...decidedBy(ctx),
    });
    return approve ? "Approved ✅" : "Declined.";
  });
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------
const RULES = [
  "lifetime_earned",
  "savings_balance",
  "category_count",
  "streak_days",
  "rewards_redeemed",
  "goals_completed",
  "manual",
] as const;

export async function saveAchievement(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    if (id) await assertOwned("achievements", id, ctx.familyId);
    const rule = str(fd, "rule_type") as (typeof RULES)[number];
    if (!RULES.includes(rule)) throw new UserError("Pick how the badge is earned.");
    const name = requiredStr(fd, "name", "a badge name", 60);
    const row = {
      name,
      description: str(fd, "description", 200),
      icon: str(fd, "icon", 16) || "⭐",
      rule_type: rule,
      threshold: rule === "manual" ? 1 : int(fd, "threshold", "Goal number", { min: 1 }),
      category: rule === "category_count" || rule === "streak_days" ? str(fd, "category", 40) || null : null,
      active: bool(fd, "active"),
    };
    if (rule === "category_count" && !row.category) throw new UserError("Pick a category for this badge.");
    const { error } = id
      ? await db().from("achievements").update(row).eq("id", id).eq("family_id", ctx.familyId)
      : await db()
          .from("achievements")
          .insert({ ...row, family_id: ctx.familyId, code: `custom_${Date.now().toString(36)}`, sort_order: 100 });
    if (error) throw new Error(error.message);
    // Unlock right away for any child who already qualifies.
    for (const c of ctx.children) await rpc("evaluate_achievements", { p_child_id: c.id });
    return id ? "Badge saved." : "Badge created.";
  });
}

export async function awardAchievement(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    const child = childFrom(ctx, fd);
    await assertOwned("achievements", id, ctx.familyId);
    if (str(fd, "op") === "revoke") {
      await db().from("user_achievements").delete().eq("achievement_id", id).eq("child_id", child.id);
      return "Badge removed.";
    }
    const { data: a } = await db().from("achievements").select("name, icon").eq("id", id).single();
    const { error } = await db()
      .from("user_achievements")
      .insert({ achievement_id: id, child_id: child.id, awarded_by: ctx.parent.id });
    if (error) throw new UserError("That badge is already unlocked.");
    await db()
      .from("celebrations")
      .insert({ child_id: child.id, kind: "achievement", title: "⭐ New badge!", message: a?.name ?? "", emoji: a?.icon ?? "⭐" });
    return `Badge given to ${child.display_name}! ⭐`;
  });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function saveSettings(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const tz = requiredStr(fd, "timezone", "a timezone", 60);
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
    } catch {
      throw new UserError("That timezone isn't valid (example: America/New_York).");
    }
    const presets = str(fd, "earn_presets", 60)
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0 && n <= 1000)
      .slice(0, 6);
    const streaks = fd.getAll("streak_categories").map(String).filter((k) => EARN_CATEGORIES.some((c) => c.key === k));
    const { error } = await db()
      .from("settings")
      .update({
        parent_title: requiredStr(fd, "parent_title", "what Levi calls you", 20),
        timezone: tz,
        parent_session_minutes: int(fd, "parent_session_minutes", "Parent Mode timeout", { min: 1, max: 720 }),
        earn_presets: presets.length ? presets : [1, 2, 5, 10],
        streak_categories: streaks,
        updated_at: new Date().toISOString(),
      })
      .eq("family_id", ctx.familyId);
    if (error) throw new Error(error.message);
    const familyName = str(fd, "family_name", 60);
    if (familyName) await db().from("families").update({ name: familyName }).eq("id", ctx.familyId);
    return "Settings saved.";
  });
}

export async function saveBonusRule(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    const enabled = bool(fd, "enabled");
    const type = str(fd, "bonus_type") === "flat" ? "flat" : "percent";
    const pct = Number(str(fd, "percent"));
    if (type === "percent" && !(pct > 0 && pct <= 100)) throw new UserError("Percent must be between 0 and 100.");
    const row: Record<string, unknown> = {
      enabled,
      bonus_type: type,
      percent: type === "percent" ? pct : 5,
      flat_amount: type === "flat" ? int(fd, "flat_amount", "Bonus amount", { max: 10000 }) : 5,
      min_balance: int(fd, "min_balance", "Minimum balance", { min: 0 }),
      frequency: str(fd, "frequency") === "weekly" ? "weekly" : "monthly",
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await db()
      .from("savings_bonus_rules")
      .select("id, enabled")
      .eq("family_id", ctx.familyId)
      .eq("id", id || "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    // Bonuses only count from the moment the rule is switched on.
    if (enabled && !existing?.enabled) row.enabled_since = new Date().toISOString();
    const { error } = existing
      ? await db().from("savings_bonus_rules").update(row).eq("id", existing.id)
      : await db().from("savings_bonus_rules").insert({ ...row, family_id: ctx.familyId });
    if (error) throw new Error(error.message);
    return enabled ? "Savings Bonus is on." : "Savings Bonus is off.";
  });
}

export async function runBonusCheck(_prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    let paid = 0;
    for (const c of ctx.children) paid += await rpc<number>("apply_due_savings_bonuses", { p_child_id: c.id });
    return paid ? `Paid ${paid} Savings Bonus${paid === 1 ? "" : "es"}.` : "Nothing due right now.";
  });
}

export async function saveChild(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    const name = requiredStr(fd, "display_name", "a name", 40);
    const emoji = str(fd, "avatar_emoji", 16) || "🙂";
    if (id) {
      await assertOwned("profiles", id, ctx.familyId);
      await db().from("profiles").update({ display_name: name, avatar_emoji: emoji }).eq("id", id).eq("role", "child");
      return "Saved.";
    }
    await rpc("create_child", { p_family_id: ctx.familyId, p_name: name, p_emoji: emoji });
    return `${name} was added. 🎉`;
  });
}

export async function inviteParent(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const email = requiredStr(fd, "email", "an email", 120).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new UserError("That email doesn't look right.");
    const { error } = await db().from("profiles").insert({
      family_id: ctx.familyId,
      role: "parent",
      display_name: requiredStr(fd, "display_name", "a name", 40),
      avatar_emoji: "🧑",
      invite_email: email,
    });
    if (error) throw new Error(error.message);
    return "Added. Create this user in Supabase Auth, then they can sign in.";
  });
}

// ---------------------------------------------------------------------------
// Weekly missions
// ---------------------------------------------------------------------------
const MISSION_KINDS = ["category_days", "save_amount", "earn_amount", "earn_count"] as const;

export async function saveMission(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return parentAction(async (ctx) => {
    const id = str(fd, "id", 40);
    if (id) {
      const { data } = await db().from("missions").select("id").eq("id", id).eq("family_id", ctx.familyId).maybeSingle();
      if (!data) throw new UserError("Not found.");
    }
    const kind = str(fd, "kind") as (typeof MISSION_KINDS)[number];
    if (!MISSION_KINDS.includes(kind)) throw new UserError("Pick what the mission is about.");
    const category = kind === "category_days" ? str(fd, "category", 40) : null;
    if (kind === "category_days" && !EARN_CATEGORIES.some((c) => c.key === category)) throw new UserError("Pick a category.");
    const row = {
      title: requiredStr(fd, "title", "a mission name", 60),
      icon: str(fd, "icon", 16) || "🎯",
      kind,
      category,
      target: int(fd, "target", "Goal number", { min: 1, max: kind === "category_days" ? 7 : 1000 }),
      reward_bucks: int(fd, "reward_bucks", "Bonus Bucks", { min: 0, max: 100 }),
      reward_xp: int(fd, "reward_xp", "XP", { min: 0, max: 500 }),
      active: bool(fd, "active"),
    };
    const { error } = id
      ? await db().from("missions").update(row).eq("id", id).eq("family_id", ctx.familyId)
      : await db().from("missions").insert({ ...row, family_id: ctx.familyId, sort_order: 100 });
    if (error) throw new Error(error.message);
    return id ? "Mission saved." : "Mission created. 🎯";
  });
}
