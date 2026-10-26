export type Hero = "jessica" | "mariano";
export type Assignee = Hero | "both";
export type ProjectStatus = "not_started" | "in_progress" | "paused" | "completed";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type Priority = "low" | "medium" | "high";
export type Size = "small" | "medium" | "large";
export type Lang = "es" | "en";

export interface Avatar {
  hair?: string;
  hairColor?: string;
  skin?: string;
  outfit?: string;
  accessory?: string;
  hat?: string;
}

export interface Settings {
  small_gold: number; small_xp: number;
  medium_gold: number; medium_xp: number;
  large_gold: number; large_xp: number;
  project_gold: number; project_xp: number;
  coop_gold: number; coop_xp: number;
}

export interface Household { id: string; name: string; treasury_gold: number; settings: Settings }

export interface Profile {
  id: string; household_id: string; hero: Hero; user_id: string | null;
  display_name: string; role_title: string; avatar: Avatar; lang: Lang;
  gold: number; xp: number; tasks_completed: number;
}

export interface Project {
  id: string; household_id: string; kind: "main" | "coop"; title: string; description: string;
  assignee: Assignee; status: ProjectStatus; priority: Priority; target_date: string | null;
  budget: number | null; reward_gold: number; reward_xp: number; unlock_key: string | null;
  icon: string; archived: boolean; sort: number; completed_at: string | null; created_at: string;
  updated_at: string;
}

export interface Task {
  id: string; household_id: string; project_id: string; title: string; notes: string;
  assignee: Assignee; status: TaskStatus; size: Size; due_date: string | null;
  reward_gold: number; reward_xp: number; sort: number; completed_by: string | null;
  completed_at: string | null; rewarded_at: string | null; created_at: string;
}

export interface ShopItem {
  id: string; category: "virtual" | "real"; title: string; description: string; icon: string;
  price: number; requires_approval: boolean; unlock_key: string | null; active: boolean; sort: number;
  created_by: string | null;
}

export type RedemptionStatus = "requested" | "approved" | "completed" | "declined" | "cancelled";
export interface Redemption {
  id: string; item_id: string | null; title: string; category: "virtual" | "real"; price: number;
  pay_from: "self" | "treasury"; requested_by: string; status: RedemptionStatus;
  decided_by: string | null; decided_at: string | null; completed_at: string | null; created_at: string;
}

export interface Unlock { id: string; key: string; source: "project" | "shop"; enabled: boolean; created_at: string }
export interface Achievement { id: string; profile_id: string; key: string; earned_at: string }

export type QuestionCategory = "know" | "appreciation" | "dreams" | "communication";
export interface Question { id: string; household_id: string | null; category: QuestionCategory; text_es: string; text_en: string; sort: number }
export interface Answer { id: string; question_id: string; profile_id: string; answer: string; created_at: string }
export interface Mark { question_id: string; saved: boolean; completed_at: string | null; updated_at: string }

export type CommentKind = "note" | "question" | "help" | "appreciation" | "suggestion";
export interface Comment {
  id: string; project_id: string | null; task_id: string | null; author: string; kind: CommentKind;
  body: string; acknowledged_by: string | null; acknowledged_at: string | null; created_at: string;
}

export interface LedgerRow {
  id: number; profile_id: string | null; kind: string; gold_delta: number; xp_delta: number;
  source_id: string | null; note: string; created_at: string;
}

export interface Award { hero: Hero; gold: number; xp: number }
