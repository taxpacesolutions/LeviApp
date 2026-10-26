"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { CHILD_COOKIE, familyActionContext } from "@/lib/context";
import { assertChild, familyAction, int, rpc, str, UserError } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

/**
 * Kid Mode actions. These can only CREATE REQUESTS — they never move Bucks.
 * A parent approves or declines in Parent Mode.
 */

export async function requestReward(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return familyAction(async (ctx) => {
    const rewardId = str(fd, "reward_id", 40);
    const req = await rpc<{ reward_name: string }>("request_redemption", {
      p_child_id: ctx.child.id,
      p_reward_id: rewardId,
    });
    return `Sent! Ask ${ctx.settings.parent_title} about ${req.reward_name}.`;
  });
}

export async function requestSave(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return familyAction(async (ctx) => {
    const amount = int(fd, "amount", "Amount");
    const goalId = str(fd, "goal_id", 40) || null;
    if (goalId) {
      const { data } = await db().from("goals").select("id").eq("id", goalId).eq("child_id", ctx.child.id).maybeSingle();
      if (!data) throw new UserError("Goal not found.");
    }
    await rpc("request_transfer", { p_child_id: ctx.child.id, p_amount: amount, p_goal_id: goalId });
    return `Sent! ${ctx.settings.parent_title} will check it.`;
  });
}

export async function cancelMyRequest(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return familyAction(async (ctx) => {
    const id = str(fd, "id", 40);
    const table = str(fd, "kind") === "transfer" ? "transfer_requests" : "redemption_requests";
    const { data, error } = await db()
      .from(table)
      .update({ status: "cancelled", decided_at: new Date().toISOString() })
      .eq("id", id)
      .eq("child_id", ctx.child.id)
      .eq("status", "pending")
      .select("id");
    if (error || !data?.length) throw new UserError("That request can't be changed.");
    return "Request cancelled.";
  });
}

export async function markCelebrationsSeen(ids: string[]) {
  const ctx = await familyActionContext();
  if (!ids.length) return;
  await db()
    .from("celebrations")
    .update({ seen_at: new Date().toISOString() })
    .in("id", ids.slice(0, 50))
    .eq("child_id", ctx.child.id);
}

export async function switchChild(childId: string) {
  const ctx = await familyActionContext();
  assertChild(ctx, childId);
  (await cookies()).set(CHILD_COOKIE, childId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function renamePet(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return familyAction(async (ctx) => {
    const name = str(fd, "pet_name", 20);
    if (!name) throw new UserError("Give your pet a name.");
    const { error } = await db()
      .from("child_progress")
      .upsert({ child_id: ctx.child.id, pet_name: name, updated_at: new Date().toISOString() }, { onConflict: "child_id" });
    if (error) throw new Error(error.message);
    return `Your pet is now called ${name}! 🦖`;
  });
}
