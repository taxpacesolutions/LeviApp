import { Lock } from "lucide-react";
import type { Achievement } from "@/lib/types";

export function BadgeGrid({ badges, tz }: { badges: Achievement[]; tz: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {badges.map((b) => {
        const on = !!b.unlocked_at;
        return (
          <li
            key={b.id}
            className={`card flex flex-col items-center p-4 text-center ${on ? "" : "bg-white/60 shadow-none ring-1 ring-line"}`}
          >
            <span
              className={`relative grid h-16 w-16 place-items-center rounded-full text-3xl ${
                on ? "bg-sun-soft ring-4 ring-sun/60" : "bg-canvas grayscale"
              }`}
            >
              <span className={on ? "" : "opacity-40"}>{b.icon}</span>
              {!on && (
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-muted shadow">
                  <Lock size={12} />
                </span>
              )}
            </span>
            <p className={`mt-3 text-sm font-extrabold ${on ? "" : "text-muted"}`}>{b.name}</p>
            <p className="mt-0.5 text-xs font-semibold text-muted">
              {on
                ? `Unlocked ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: tz }).format(new Date(b.unlocked_at!))}`
                : b.description}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
