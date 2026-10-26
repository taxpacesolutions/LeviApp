import type { Assignee, Hero, Profile, Settings, Size, Task } from "./types";

// XP needed to reach each level. Gentle curve: a few weeks of normal use per level.
export const LEVELS = [0, 100, 300, 700, 1500];

export function levelOf(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) level = i + 1;
  const cur = LEVELS[level - 1];
  const next = LEVELS[level] ?? null;
  const progress = next === null ? 1 : (xp - cur) / (next - cur);
  return { level, cur, next, progress };
}

export const DEFAULT_SETTINGS: Settings = {
  small_gold: 10, small_xp: 10, medium_gold: 25, medium_xp: 20, large_gold: 50, large_xp: 40,
  project_gold: 150, project_xp: 100, coop_gold: 75, coop_xp: 50,
};

export function sizeReward(s: Settings | undefined, size: Size) {
  const set = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  return { gold: set[`${size}_gold`], xp: set[`${size}_xp`] };
}

export function heroesOf(a: Assignee): Hero[] {
  return a === "both" ? ["jessica", "mariano"] : [a];
}

export function involves(a: Assignee, hero: Hero) {
  return a === "both" || a === hero;
}

export function progressOf(tasks: Task[]) {
  if (!tasks.length) return 0;
  return tasks.filter((t) => t.status === "completed").length / tasks.length;
}

export function partnerOf(profiles: Profile[], me: Profile | undefined) {
  return profiles.find((p) => p.id !== me?.id);
}

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function daysUntil(date: string) {
  const a = new Date(todayISO() + "T00:00:00");
  const b = new Date(date + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
