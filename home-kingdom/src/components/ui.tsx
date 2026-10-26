import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon, Sprite } from "../pixel/Sprite";
import { heroSprite } from "../pixel/hero";
import { unlockPreview } from "../pixel/scene";
import { UNLOCKS } from "../lib/catalog";
import { useStore } from "../lib/store";
import { useT } from "../lib/i18n";
import type { Assignee, Profile } from "../lib/types";

export function Panel({ title, icon, right, children, className = "", tone = "paper" }: {
  title?: ReactNode; icon?: string; right?: ReactNode; children: ReactNode; className?: string;
  tone?: "paper" | "parchment";
}) {
  return (
    <section className={`${tone === "paper" ? "panel" : "panel-parchment"} p-3 ${className}`}>
      {title && (
        <div className="mb-2 flex items-center gap-2">
          {icon && <Icon name={icon} size={2} />}
          <h2 className="flex-1 text-lg leading-tight">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Sheet({ open, title, onClose, children }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center fade-in" role="dialog" aria-modal="true">
      <button aria-label={t("close")} className="absolute inset-0 bg-[#3b2a1e]/50" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="panel sheet-in relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col rounded-b-none outline-none">
        <div className="panel-wood flex items-center gap-2 rounded-b-none border-0 border-b-3 px-3 py-2">
          <h2 className="flex-1 text-lg text-[#fff8e6]">{title}</h2>
          <button className="btn btn-sm" onClick={onClose} aria-label={t("close")}>✕</button>
        </div>
        <div className="overflow-y-auto overscroll-contain p-3 pb-6 safe-bottom">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: ReactNode; children: (id: string) => ReactNode; hint?: ReactNode }) {
  const id = useId();
  return (
    <div className="mb-3">
      <label htmlFor={id} className="label">{label}</label>
      {children(id)}
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="mb-3">
      <span className="label">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} aria-pressed={value === o.value}
            className="chip" onClick={() => onChange(o.value)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ value, kind = "green", label }: { value: number; kind?: "green" | "xp" | "gold"; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`bar ${kind === "green" ? "" : kind}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Gold({ n, size = 2, className = "" }: { n: number; size?: number; className?: string }) {
  const t = useT();
  return (
    <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${className}`}>
      <Icon name="coin" size={size} label={t("gold")} />{n}
    </span>
  );
}

export function Xp({ n, size = 2, className = "" }: { n: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${className}`}>
      <Icon name="xp" size={size} label="XP" />{n}
    </span>
  );
}

export function HeroAvatar({ profile, scale = 3, className = "" }: { profile: Profile | undefined; scale?: number; className?: string }) {
  if (!profile) return null;
  return <Sprite grid={heroSprite(profile.hero, profile.avatar)} scale={scale} className={className} label={profile.display_name} />;
}

const HERO_COLORS = { jessica: "#f3b7c4", mariano: "#a9c8ec", both: "#c9e3a4" };

export function AssigneeBadge({ assignee }: { assignee: Assignee }) {
  const t = useT();
  const { data } = useStore();
  const name = (h: "jessica" | "mariano") => data.profiles.find((p) => p.hero === h)?.display_name ?? t(h);
  const text = assignee === "both" ? t("both") : name(assignee);
  return <span className="badge" style={{ background: HERO_COLORS[assignee] }}>{assignee === "both" ? "♥ " : ""}{text}</span>;
}

export function useHeroName() {
  const { data } = useStore();
  const t = useT();
  return (hero: "jessica" | "mariano") => data.profiles.find((p) => p.hero === hero)?.display_name ?? t(hero);
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-3 text-center text-ink-soft">{children}</p>;
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3 safe-top" aria-live="polite">
      {toasts.map((m) => (
        <div key={m.id} className={`panel pop flex max-w-md items-center gap-2 px-3 py-2 font-semibold ${m.tone === "bad" ? "bg-[#fde3dc]!" : m.tone === "good" ? "bg-[#e6f5d9]!" : ""}`}>
          {m.icon && <Icon name={m.icon} size={2} />}
          <span>{m.text}</span>
        </div>
      ))}
    </div>
  );
}

// Floating "+25 gold +20 XP" after completing something. Taps anywhere to dismiss.
export function CelebrationOverlay() {
  const { celebration, clearCelebration, data, me } = useStore();
  const t = useT();
  useEffect(() => {
    if (!celebration) return;
    const h = setTimeout(clearCelebration, 2300);
    return () => clearTimeout(h);
  }, [celebration, clearCelebration]);
  if (!celebration) return null;
  const { awards, unlock } = celebration;
  const both = awards.length > 1;
  const mine = awards.find((a) => a.hero === me?.hero) ?? awards[0];
  return (
    <button className="fixed inset-0 z-50 flex items-center justify-center bg-transparent" onClick={clearCelebration} aria-live="assertive">
      <div className="rise panel-wood relative flex flex-col items-center gap-1 px-6 py-4 text-center">
        {[-40, -20, 0, 20, 40].map((dx, i) => (
          <span key={i} className="coin-fly pointer-events-none absolute top-0 left-1/2" style={{ ["--dx" as string]: `${dx}px`, animationDelay: `${i * 70}ms` }}>
            <Icon name="coin" size={2} />
          </span>
        ))}
        <div className="font-pixel text-xl text-[#fff8e6]">{both ? t("earned_both") : t("earned")}</div>
        {mine && (
          <div className="flex items-center gap-3 rounded bg-[#fff8e6] px-3 py-1 text-ink">
            <Gold n={mine.gold} size={3} className="text-2xl" /> <Xp n={mine.xp} size={3} className="text-2xl" />
          </div>
        )}
        {both && <div className="text-sm text-[#fff8e6]">{data.profiles.map((p) => p.display_name).join(" + ")}</div>}
        {unlock && UNLOCKS[unlock] && (
          <div className="mt-1 flex items-center gap-2 text-[#fff8e6]">
            <Sprite grid={unlockPreview(unlock)} scale={2} /> {t("unlocked_toast", { title: UNLOCKS[unlock].title[t.lang] })}
          </div>
        )}
      </div>
    </button>
  );
}
