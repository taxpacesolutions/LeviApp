import { ProgressBar } from "@/components/ui/ProgressBar";
import type { MissionProgress } from "@/lib/types";

export function MissionList({ missions, empty = "No missions this week." }: { missions: MissionProgress[]; empty?: string }) {
  if (!missions.length) return <p className="card text-center font-bold text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {missions.map((m) => {
        const pct = Math.round((m.progress / m.target) * 100);
        return (
          <li
            key={m.id}
            className={`card relative overflow-hidden p-4 ${m.done ? "bg-mint-soft shadow-none ring-2 ring-mint/50" : ""}`}
          >
            <div className="flex items-center gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${m.done ? "bg-white" : "bg-sun-soft"}`}>
                {m.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`font-extrabold ${m.done ? "text-mint-ink" : ""}`}>{m.title}</p>
                <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs font-extrabold">
                  {m.reward_bucks > 0 && <span className="rounded-full bg-sun-soft px-2 py-0.5 text-sun-ink">+{m.reward_bucks} Bucks</span>}
                  {m.reward_xp > 0 && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand-ink">+{m.reward_xp} XP</span>}
                </p>
              </div>
              {m.done ? (
                <span className="rotate-[-8deg] rounded-xl border-2 border-mint px-2 py-1 text-xs font-black uppercase tracking-wider text-mint-ink">
                  Done ✓
                </span>
              ) : (
                <span className="num text-lg font-black text-muted">
                  {m.progress}/{m.target}
                </span>
              )}
            </div>
            {!m.done && (
              <div className="mt-3">
                <ProgressBar value={pct} tone="sun" />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
