import "server-only";
import { db } from "@/lib/supabase/admin";
import type {
  Achievement,
  Celebration,
  Goal,
  LedgerRow,
  Overview,
  RedemptionRequest,
  Reward,
  SavingsBonusRule,
  TransferRequest,
} from "@/lib/types";

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getOverview(childId: string): Promise<Overview> {
  return check(await db().rpc("child_overview", { p_child_id: childId })) as Overview;
}

export const LEDGER_FILTERS = {
  all: null,
  earned: ["earn"],
  spent: ["spend"],
  savings: ["transfer_to_savings", "transfer_from_savings"],
  bonuses: ["bonus"],
  adjustments: ["adjustment", "reversal"],
} as const;
export type LedgerFilter = keyof typeof LEDGER_FILTERS;

export async function getLedger(childId: string, filter: LedgerFilter = "all", limit = 200): Promise<LedgerRow[]> {
  let q = db()
    .from("transaction_ledger")
    .select("*")
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .order("seq", { ascending: false })
    .limit(limit);
  const types = LEDGER_FILTERS[filter];
  if (types) q = q.in("type", [...types]);
  return check(await q) as LedgerRow[];
}

export async function getRewards(familyId: string, childId: string | null, includeInactive = false): Promise<Reward[]> {
  let q = db().from("rewards").select("*").eq("family_id", familyId).order("cost").order("sort_order");
  if (!includeInactive) q = q.eq("active", true);
  if (childId) q = q.or(`child_id.is.null,child_id.eq.${childId}`);
  return check(await q) as Reward[];
}

export async function getGoals(childId: string): Promise<Goal[]> {
  const rows = check(
    await db().from("goal_progress").select("*").eq("child_id", childId).order("sort_order").order("created_at"),
  ) as Goal[];
  const rank = (g: Goal) => (g.purchased_at ? 3 : g.status === "active" ? 0 : g.status === "completed" ? 1 : 2);
  return rows.sort((a, b) => rank(a) - rank(b));
}

export async function getPendingRequests(familyId: string, childId?: string) {
  let r = db()
    .from("redemption_requests")
    .select("*")
    .eq("family_id", familyId)
    .eq("status", "pending")
    .order("requested_at");
  let t = db()
    .from("transfer_requests")
    .select("*")
    .eq("family_id", familyId)
    .eq("status", "pending")
    .order("requested_at");
  if (childId) {
    r = r.eq("child_id", childId);
    t = t.eq("child_id", childId);
  }
  const [redemptions, transfers] = await Promise.all([r, t]);
  return {
    redemptions: check(redemptions) as RedemptionRequest[],
    transfers: check(transfers) as TransferRequest[],
  };
}

export async function getRecentDecisions(familyId: string, limit = 15) {
  const [r, t] = await Promise.all([
    db()
      .from("redemption_requests")
      .select("*")
      .eq("family_id", familyId)
      .neq("status", "pending")
      .order("decided_at", { ascending: false })
      .limit(limit),
    db()
      .from("transfer_requests")
      .select("*")
      .eq("family_id", familyId)
      .neq("status", "pending")
      .order("decided_at", { ascending: false })
      .limit(limit),
  ]);
  return { redemptions: check(r) as RedemptionRequest[], transfers: check(t) as TransferRequest[] };
}

export async function getAchievements(familyId: string, childId: string, includeInactive = false): Promise<Achievement[]> {
  let q = db().from("achievements").select("*").eq("family_id", familyId).order("sort_order");
  if (!includeInactive) q = q.eq("active", true);
  const [achs, unlocked] = await Promise.all([
    q,
    db().from("user_achievements").select("achievement_id, unlocked_at").eq("child_id", childId),
  ]);
  const map = new Map(
    (check(unlocked) as { achievement_id: string; unlocked_at: string }[]).map((u) => [u.achievement_id, u.unlocked_at]),
  );
  return (check(achs) as Achievement[]).map((a) => ({ ...a, unlocked_at: map.get(a.id) ?? null }));
}

export async function getUnseenCelebrations(childId: string): Promise<Celebration[]> {
  return check(
    await db()
      .from("celebrations")
      .select("id, kind, title, message, emoji, created_at")
      .eq("child_id", childId)
      .is("seen_at", null)
      .order("created_at")
      .limit(10),
  ) as Celebration[];
}

export async function getBonusRule(familyId: string): Promise<SavingsBonusRule | null> {
  const { data } = await db()
    .from("savings_bonus_rules")
    .select("*")
    .eq("family_id", familyId)
    .is("child_id", null)
    .order("created_at")
    .limit(1)
    .maybeSingle<SavingsBonusRule>();
  return data;
}

export async function getBonusAwards(childId: string, limit = 6) {
  return check(
    await db()
      .from("savings_bonus_awards")
      .select("period_key, min_balance, amount, created_at")
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ) as { period_key: string; min_balance: number; amount: number; created_at: string }[];
}

export async function getParents(familyId: string) {
  return check(
    await db()
      .from("profiles")
      .select("id, display_name, avatar_emoji, auth_user_id, invite_email, active")
      .eq("family_id", familyId)
      .eq("role", "parent")
      .order("created_at"),
  ) as { id: string; display_name: string; avatar_emoji: string; auth_user_id: string | null; invite_email: string | null; active: boolean }[];
}

/** Idempotent: pays any Savings Bonus that is due for the previous period. */
export async function applyDueSavingsBonuses(childId: string) {
  await db().rpc("apply_due_savings_bonuses", { p_child_id: childId });
}
