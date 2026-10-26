import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import { levelOf } from "./game";
import type {
  Achievement, Answer, Award, Comment, Household, LedgerRow, Mark, Profile, Project, Question, Redemption, ShopItem, Task, Unlock,
} from "./types";

export interface Data {
  household: Household | null;
  profiles: Profile[];
  projects: Project[];
  tasks: Task[];
  items: ShopItem[];
  redemptions: Redemption[];
  unlocks: Unlock[];
  achievements: Achievement[];
  questions: Question[];
  answers: Answer[];
  marks: Mark[];
  comments: Comment[];
  ledger: LedgerRow[];
}

const EMPTY: Data = {
  household: null, profiles: [], projects: [], tasks: [], items: [], redemptions: [], unlocks: [], achievements: [],
  questions: [], answers: [], marks: [], comments: [], ledger: [],
};

type Key = keyof Data;

// One loader per table. Small household data, so each loads in full.
const LOADERS: Record<string, [Key, () => PromiseLike<{ data: unknown; error: unknown }>]> = {
  hk_households: ["household", () => supabase.from("hk_households").select("id,name,treasury_gold,settings").maybeSingle()],
  hk_profiles: ["profiles", () => supabase.from("hk_profiles")
    .select("id,household_id,hero,user_id,display_name,role_title,avatar,lang,gold,xp,tasks_completed").order("hero")],
  hk_projects: ["projects", () => supabase.from("hk_projects").select("*").order("sort").order("created_at")],
  hk_tasks: ["tasks", () => supabase.from("hk_tasks").select("*").order("sort").order("created_at")],
  hk_shop_items: ["items", () => supabase.from("hk_shop_items").select("*").order("sort").order("created_at")],
  hk_redemptions: ["redemptions", () => supabase.from("hk_redemptions").select("*").order("created_at", { ascending: false }).limit(200)],
  hk_unlocks: ["unlocks", () => supabase.from("hk_unlocks").select("id,key,source,enabled,created_at").order("created_at")],
  hk_achievements: ["achievements", () => supabase.from("hk_achievements").select("id,profile_id,key,earned_at").order("earned_at")],
  hk_campfire_questions: ["questions", () => supabase.from("hk_campfire_questions").select("*").order("sort").order("created_at")],
  hk_campfire_answers: ["answers", () => supabase.from("hk_campfire_answers").select("*").order("created_at")],
  hk_campfire_marks: ["marks", () => supabase.from("hk_campfire_marks").select("question_id,saved,completed_at,updated_at")],
  hk_comments: ["comments", () => supabase.from("hk_comments").select("*").order("created_at", { ascending: false }).limit(300)],
  hk_ledger: ["ledger", () => supabase.from("hk_ledger").select("id,profile_id,kind,gold_delta,xp_delta,source_id,note,created_at")
    .order("created_at", { ascending: false }).limit(60)],
};
export type Table = keyof typeof LOADERS;
const ALL_TABLES = Object.keys(LOADERS) as Table[];

export interface ToastMsg { id: number; text: string; tone: "info" | "good" | "bad"; icon?: string }
export interface Celebration { id: number; awards: Award[]; unlock?: string | null }

interface Store {
  data: Data;
  me: Profile | undefined;
  partner: Profile | undefined;
  ready: boolean;
  offline: boolean;
  refresh: (...tables: Table[]) => Promise<void>;
  /** Runs a change, shows errors kindly, then reloads the affected tables. */
  run: <T>(fn: () => Promise<T>, tables: Table[], okText?: string) => Promise<T | undefined>;
  toasts: ToastMsg[];
  toast: (text: string, tone?: ToastMsg["tone"], icon?: string) => void;
  celebration: Celebration | null;
  celebrate: (awards: Award[], unlock?: string | null) => void;
  clearCelebration: () => void;
  errorText: (e: unknown) => string;
}

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}

interface ProviderProps {
  profileId: string;
  children: ReactNode;
  errorText: (e: unknown) => string;
  onLevelUp: (p: Profile, level: number) => string;
  onAchievement: (a: Achievement, who: Profile | undefined) => string;
  onUnlock: (key: string) => string;
}

export function StoreProvider({ profileId, children, errorText, onLevelUp, onAchievement, onUnlock }: ProviderProps) {
  const cacheKey = `hk-cache-${profileId}`;
  const [data, setData] = useState<Data>(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) return { ...EMPTY, ...JSON.parse(raw) };
    } catch { /* no cache */ }
    return EMPTY;
  });
  const [ready, setReady] = useState(() => data.household !== null);
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const seq = useRef(1);
  const loadedOnce = useRef(false);

  const toast = useCallback((text: string, tone: ToastMsg["tone"] = "info", icon?: string) => {
    const id = seq.current++;
    setToasts((t) => [...t.slice(-2), { id, text, tone, icon }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "bad" ? 5000 : 3200);
  }, []);

  // Watch for level-ups, new achievements and unlocks (from either phone).
  const prev = useRef<Data | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = data;
    if (!before || !loadedOnce.current) return;
    for (const p of data.profiles) {
      const old = before.profiles.find((x) => x.id === p.id);
      if (old && levelOf(p.xp).level > levelOf(old.xp).level) toast(onLevelUp(p, levelOf(p.xp).level), "good", "crown");
    }
    const oldA = new Set(before.achievements.map((a) => a.id));
    if (before.achievements.length || before.household)
      for (const a of data.achievements) if (!oldA.has(a.id)) toast(onAchievement(a, data.profiles.find((p) => p.id === a.profile_id)), "good", "star");
    const oldU = new Set(before.unlocks.map((u) => u.key));
    for (const u of data.unlocks) if (!oldU.has(u.key)) toast(onUnlock(u.key), "good", "castle");
  }, [data, toast, onLevelUp, onAchievement, onUnlock]);

  const refresh = useCallback(async (...tables: Table[]) => {
    const list = tables.length ? tables : ALL_TABLES;
    const results = await Promise.all(list.map(async (t) => {
      const [key, load] = LOADERS[t];
      const { data: rows, error } = await load();
      if (error) throw error;
      return [key, rows] as const;
    }));
    setData((d) => {
      const next = { ...d };
      for (const [key, rows] of results) (next as Record<string, unknown>)[key] = rows ?? (key === "household" ? null : []);
      try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch { /* storage full or blocked */ }
      return next;
    });
  }, [cacheKey]);

  // First load + realtime sync + refresh when the app comes back to the front.
  useEffect(() => {
    let alive = true;
    refresh()
      .then(() => { if (alive) { loadedOnce.current = true; setReady(true); setOffline(false); } })
      .catch(() => { if (alive) { setOffline(true); setReady(true); } });

    const pending = new Map<Table, ReturnType<typeof setTimeout>>();
    const schedule = (t: Table) => {
      clearTimeout(pending.get(t));
      pending.set(t, setTimeout(() => { pending.delete(t); refresh(t).catch(() => {}); }, 250));
    };
    const channel = supabase.channel(`hk-${profileId}`);
    for (const t of ALL_TABLES) channel.on("postgres_changes", { event: "*", schema: "public", table: t }, () => schedule(t));
    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh().then(() => setOffline(false)).catch(() => setOffline(true));
    };
    const onOnline = () => { setOffline(false); refresh().catch(() => {}); };
    const onOffline = () => setOffline(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      alive = false;
      pending.forEach((h) => clearTimeout(h));
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [profileId, refresh]);

  const run = useCallback(async <T,>(fn: () => Promise<T>, tables: Table[], okText?: string) => {
    try {
      const result = await fn();
      if (okText) toast(okText, "good");
      await refresh(...tables).catch(() => {});
      return result;
    } catch (e) {
      toast(errorText(e), "bad");
      refresh(...tables).catch(() => {});
      return undefined;
    }
  }, [refresh, toast, errorText]);

  const celebrate = useCallback((awards: Award[], unlock?: string | null) => {
    if (!awards.length && !unlock) return;
    setCelebration({ id: seq.current++, awards, unlock });
  }, []);

  const value = useMemo<Store>(() => {
    const me = data.profiles.find((p) => p.id === profileId);
    const partner = data.profiles.find((p) => p.id !== profileId);
    return {
      data, me, partner, ready, offline, refresh, run, toasts, toast, celebration, celebrate,
      clearCelebration: () => setCelebration(null), errorText,
    };
  }, [data, profileId, ready, offline, refresh, run, toasts, toast, celebration, celebrate, errorText]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Throws on Supabase errors so `run` can show them.
export async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}
