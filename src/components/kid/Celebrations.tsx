"use client";

import { useEffect, useMemo, useState } from "react";
import { markCelebrationsSeen } from "@/actions/kid";
import { play, type SoundName } from "@/lib/sound";
import type { Celebration } from "@/lib/types";

const COLORS = ["#1f6feb", "#2fbf71", "#ffc83d", "#e5484d", "#7c5cff"];
const SOUND: Record<Celebration["kind"], SoundName> = {
  achievement: "tada",
  goal: "tada",
  streak: "coin",
  savings: "coin",
  level: "levelup",
  pet: "grow",
  mission: "coin",
};
const LOOK: Record<Celebration["kind"], { ring: string; bg: string; label: string }> = {
  achievement: { ring: "ring-sun/40", bg: "bg-sun-soft", label: "New badge" },
  goal: { ring: "ring-mint/40", bg: "bg-mint-soft", label: "Goal reached" },
  streak: { ring: "ring-coral/30", bg: "bg-coral-soft", label: "Streak" },
  savings: { ring: "ring-mint/40", bg: "bg-mint-soft", label: "Savings Bonus" },
  level: { ring: "ring-brand/40", bg: "bg-brand-soft", label: "Level up" },
  pet: { ring: "ring-mint/40", bg: "bg-mint-soft", label: "Your pet grew" },
  mission: { ring: "ring-sun/40", bg: "bg-sun-soft", label: "Mission complete" },
};

/** Shows unseen celebrations one at a time, with confetti (or falling coins) and a sound. */
export function Celebrations({ items }: { items: Celebration[] }) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const current = items[index];

  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 7) * 0.08}s`,
        color: COLORS[i % COLORS.length],
      })),
    [],
  );

  useEffect(() => {
    if (current && !dismissed) play(SOUND[current.kind] ?? "tada");
  }, [current, dismissed]);

  if (!current || dismissed) return null;
  const look = LOOK[current.kind] ?? LOOK.achievement;
  const coins = current.kind === "mission" || current.kind === "savings" || current.kind === "level";

  const next = () => {
    if (index + 1 < items.length) setIndex(index + 1);
    else {
      setDismissed(true);
      void markCelebrationsSeen(items.map((c) => c.id));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-navy/60 p-6" role="dialog" aria-modal="true" aria-label={current.title}>
      <div key={current.id} className="animate-pop relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-8 text-center shadow-2xl">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {coins
            ? pieces.slice(0, 16).map((p, i) => (
                <span key={i} className="coin-piece" style={{ left: p.left, animationDelay: p.delay }}>
                  🪙
                </span>
              ))
            : pieces.map((p, i) => (
                <span key={i} className="confetti-piece" style={{ left: p.left, animationDelay: p.delay, background: p.color }} />
              ))}
        </div>
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-widest text-muted">{look.label}</p>
          <div className={`mx-auto mt-3 grid h-28 w-28 place-items-center rounded-full text-6xl ring-8 ${look.bg} ${look.ring} ${current.kind === "pet" ? "pet-bounce" : ""}`}>
            {current.emoji}
          </div>
          <h2 className="mt-5 text-2xl font-black">{current.title}</h2>
          {current.message && <p className="mt-2 text-lg font-bold text-muted">{current.message}</p>}
          <button
            autoFocus
            onClick={next}
            className="mt-6 w-full rounded-2xl bg-brand py-4 text-lg font-black text-white transition hover:bg-brand-ink active:scale-[0.98]"
          >
            {index + 1 < items.length ? "Next ➜" : "Yay! 🎉"}
          </button>
          {items.length > 1 && (
            <p className="mt-3 text-xs font-bold text-muted">
              {index + 1} of {items.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
