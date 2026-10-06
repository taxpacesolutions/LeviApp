export type TxnType =
  | "earn"
  | "spend"
  | "transfer_to_savings"
  | "transfer_from_savings"
  | "bonus"
  | "adjustment"
  | "reversal";

export interface Profile {
  id: string;
  family_id: string;
  role: "parent" | "child";
  display_name: string;
  avatar_emoji: string;
  auth_user_id: string | null;
  invite_email: string | null;
  active: boolean;
  sort_order: number;
}

export interface Settings {
  family_id: string;
  pin_is_default: boolean;
  parent_title: string;
  timezone: string;
  parent_session_minutes: number;
  earn_presets: number[];
  streak_categories: string[];
}

export interface LedgerRow {
  id: string;
  seq: number;
  child_id: string;
  type: TxnType;
  available_delta: number;
  savings_delta: number;
  category: string | null;
  description: string;
  note: string | null;
  goal_id: string | null;
  reward_id: string | null;
  reverses_transaction_id: string | null;
  created_by_label: string;
  created_at: string;
  available_after: number;
  savings_after: number;
  is_reversed: boolean;
}

export interface Reward {
  id: string;
  family_id: string;
  child_id: string | null;
  name: string;
  description: string;
  cost: number;
  icon: string;
  image_url: string | null;
  active: boolean;
  sort_order: number;
}

export type GoalStatus = "active" | "paused" | "completed";

export interface Goal {
  id: string;
  child_id: string;
  name: string;
  target_amount: number;
  icon: string;
  image_url: string | null;
  target_date: string | null;
  status: GoalStatus;
  completed_at: string | null;
  purchased_at: string | null;
  saved: number;
  sort_order: number;
}

export type RequestStatus = "pending" | "approved" | "declined" | "cancelled";

export interface RedemptionRequest {
  id: string;
  child_id: string;
  reward_id: string | null;
  reward_name: string;
  reward_icon: string;
  cost: number;
  status: RequestStatus;
  requested_at: string;
  decided_at: string | null;
  decision_note: string | null;
}

export interface TransferRequest {
  id: string;
  child_id: string;
  amount: number;
  goal_id: string | null;
  status: RequestStatus;
  requested_at: string;
  decided_at: string | null;
  decision_note: string | null;
}

export type AchievementRule =
  | "lifetime_earned"
  | "savings_balance"
  | "category_count"
  | "streak_days"
  | "rewards_redeemed"
  | "goals_completed"
  | "manual";

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  rule_type: AchievementRule;
  threshold: number;
  category: string | null;
  active: boolean;
  sort_order: number;
  unlocked_at?: string | null;
}

export interface StreakInfo {
  category: string;
  current: number;
  longest: number;
  done_today: boolean;
}

export interface Overview {
  available: number;
  savings: number;
  allocated: number;
  week_earned: number;
  week_spent: number;
  week_saved: number;
  week_top_category: string | null;
  lifetime_earned: number;
  streaks: StreakInfo[];
  pending_redemptions: number;
  pending_transfers: number;
  pending_redemption_total: number;
  pending_transfer_total: number;
}

export interface Celebration {
  id: string;
  kind: "achievement" | "goal" | "streak" | "savings";
  title: string;
  message: string;
  emoji: string;
  created_at: string;
}

export interface SavingsBonusRule {
  id: string;
  enabled: boolean;
  bonus_type: "percent" | "flat";
  percent: number;
  flat_amount: number;
  min_balance: number;
  frequency: "weekly" | "monthly";
  enabled_since: string;
}

export type ActionResult = { ok: boolean; message: string; locked?: boolean } | null;
