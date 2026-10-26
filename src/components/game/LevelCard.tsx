import type { GameState } from "@/lib/types";

/** Level badge + XP bar. XP comes from Bucks earned, Bucks saved and missions. */
export function LevelCard({ game, compact = false }: { game: GameState; compact?: boolean }) {
  const { level, xp } = game;
  const span = level.next_xp ? level.next_xp - level.min_xp : 1;
  const into = xp - level.min_xp;
  const pct = level.next_xp ? Math.max(4, Math.min(100, Math.round((into / span) * 100))) : 100;
  return (
    <section className={`card relative overflow-hidden ${compact ? "p-4" : ""}`} aria-label={`Level ${level.level}`}>
      <div className="flex items-center gap-4">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sun to-[#ff9f1c] text-3xl shadow-md">
          {level.emoji}
          <span className="num absolute -bottom-2 -right-2 grid h-7 min-w-7 place-items-center rounded-full bg-navy px-1.5 text-xs font-black text-white ring-2 ring-white">
            {level.level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Level {level.level}</p>
          <p className="truncate text-xl font-black">{level.title}</p>
          <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }}>
              <div className="xp-shine h-full w-full rounded-full" />
            </div>
          </div>
          <p className="num mt-1 text-xs font-bold text-muted">
            {level.next_xp ? (
              <>
                {xp} XP · <span className="text-ink">{level.next_xp - xp} XP</span> to {level.next_title}
              </>
            ) : (
              <>{xp} XP · top level!</>
            )}
          </p>
        </div>
      </div>
      {!compact && (
        <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-xs font-bold text-brand-ink">
          Earn XP by earning Bucks ⭐, saving Bucks 🐷 and finishing missions 🎯
        </p>
      )}
    </section>
  );
}
