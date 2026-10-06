import type { ReactNode } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { percent } from "@/lib/format";
import type { Goal } from "@/lib/types";

export function GoalVisual({ goal, size = 56 }: { goal: Pick<Goal, "icon" | "image_url" | "name">; size?: number }) {
  return goal.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={goal.image_url} alt="" width={size} height={size} className="shrink-0 rounded-2xl object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-2xl bg-sun-soft" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {goal.icon}
    </span>
  );
}

export function GoalCard({ goal, children, tz }: { goal: Goal; children?: ReactNode; tz?: string }) {
  const pct = percent(goal.saved, goal.target_amount);
  const left = Math.max(0, goal.target_amount - goal.saved);
  const done = goal.saved >= goal.target_amount;
  return (
    <article className={`card ${goal.status === "paused" ? "opacity-75" : ""}`}>
      <div className="flex items-center gap-4">
        <GoalVisual goal={goal} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-extrabold">{goal.name}</h3>
            {goal.purchased_at ? (
              <span className="rounded-full bg-mint-soft px-2 py-0.5 text-xs font-extrabold text-mint-ink">Bought 🎉</span>
            ) : goal.status === "paused" ? (
              <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-extrabold text-muted">Paused</span>
            ) : done ? (
              <span className="rounded-full bg-sun-soft px-2 py-0.5 text-xs font-extrabold text-sun-ink">Goal reached!</span>
            ) : null}
          </div>
          <p className="num text-sm font-bold text-muted">
            <span className="text-ink">{goal.saved}</span> of {goal.target_amount} Bucks
            {goal.target_date && tz && !goal.purchased_at && (
              <> · by {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(goal.target_date))}</>
            )}
          </p>
        </div>
        <p className="num text-2xl font-black text-mint-ink">{pct}%</p>
      </div>
      <div className="mt-4">
        <ProgressBar value={pct} size="lg" />
        {!goal.purchased_at && (
          <p className="mt-2 text-sm font-bold text-muted">
            {done ? "You did it! 🎉" : `${left} more Bucks to go`}
          </p>
        )}
      </div>
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </article>
  );
}
