import { categoryInfo } from "@/lib/categories";
import type { StreakInfo } from "@/lib/types";

/** Encouraging-only streak display. A missed day just means "start fresh". */
export function StreakList({ streaks, tracked }: { streaks: StreakInfo[]; tracked: string[] }) {
  const byCat = new Map(streaks.map((s) => [s.category, s]));
  const items = tracked.map((c) => byCat.get(c) ?? { category: c, current: 0, longest: 0, done_today: false });
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((s) => {
        const info = categoryInfo(s.category);
        return (
          <li key={s.category} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
            <span className="text-2xl">{s.current > 0 ? "🔥" : info.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">
                {s.current > 0 ? (
                  <>
                    <span className="num">{s.current}</span>-day {info.label} streak
                  </>
                ) : (
                  <>{info.label}</>
                )}
              </p>
              <p className="text-xs font-bold text-muted">
                {s.done_today
                  ? "Done today — nice!"
                  : s.current > 0
                    ? "Keep it going today!"
                    : "Start a new streak today!"}
                {s.longest > 1 && ` · Best: ${s.longest} days`}
              </p>
            </div>
            {s.done_today && <span className="rounded-full bg-mint-soft px-2 py-1 text-xs font-black text-mint-ink">✓</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function bestStreak(streaks: StreakInfo[]) {
  return streaks.reduce<StreakInfo | null>((best, s) => (!best || s.current > best.current ? s : best), null);
}
