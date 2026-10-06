import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getFamilyContext } from "@/lib/context";
import { getGoals, getLedger, getOverview, getPendingRequests } from "@/lib/data";
import { categoryInfo } from "@/lib/categories";
import { percent } from "@/lib/format";
import { BalanceHero } from "@/components/BalanceHero";
import { StatCard } from "@/components/StatCard";
import { WeeklySummary } from "@/components/WeeklySummary";
import { TxnList } from "@/components/TxnList";
import { GoalVisual } from "@/components/GoalCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { bestStreak } from "@/components/Streaks";

export default async function KidHome() {
  const ctx = await getFamilyContext();
  const [o, goals, recent, pending] = await Promise.all([
    getOverview(ctx.child.id),
    getGoals(ctx.child.id),
    getLedger(ctx.child.id, "all", 5),
    getPendingRequests(ctx.familyId, ctx.child.id),
  ]);
  const goal = goals.find((g) => g.status === "active" && !g.purchased_at);
  const streak = bestStreak(o.streaks);
  const waiting = pending.redemptions.length + pending.transfers.length;

  return (
    <div className="space-y-4">
      <BalanceHero available={o.available} savings={o.savings} />

      {waiting > 0 && (
        <Link href="/kid/store" className="card flex items-center gap-3 bg-sun-soft py-4 shadow-none">
          <span className="text-2xl">⏳</span>
          <p className="flex-1 font-extrabold text-sun-ink">
            {waiting} {waiting === 1 ? "request is" : "requests are"} waiting for {ctx.settings.parent_title}
          </p>
          <ChevronRight className="text-sun-ink" />
        </Link>
      )}

      <Link href="/kid/goals" className="card block transition hover:-translate-y-0.5">
        <p className="text-sm font-extrabold text-muted">🎯 Current Goal</p>
        {goal ? (
          <div className="mt-3 flex items-center gap-4">
            <GoalVisual goal={goal} size={52} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black">{goal.name}</p>
              <p className="num text-sm font-bold text-muted">
                {goal.saved} of {goal.target_amount} Bucks
              </p>
              <div className="mt-2">
                <ProgressBar value={percent(goal.saved, goal.target_amount)} />
              </div>
            </div>
            <p className="num text-2xl font-black text-mint-ink">{percent(goal.saved, goal.target_amount)}%</p>
          </div>
        ) : (
          <p className="mt-2 font-bold">No goal yet. Ask {ctx.settings.parent_title} to make one!</p>
        )}
      </Link>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon="⭐" label="This week" tone="mint" value={`+${o.week_earned}`} sub="Bucks earned" />
        <StatCard
          icon="🔥"
          label="Streak"
          tone="sun"
          value={streak && streak.current > 0 ? `${streak.current} day${streak.current === 1 ? "" : "s"}` : "Ready!"}
          sub={streak && streak.current > 0 ? categoryInfo(streak.category).label : "Start one today"}
        />
      </div>

      <WeeklySummary o={o} />

      <section>
        <div className="mb-2 mt-6 flex items-center justify-between px-1">
          <h2 className="text-lg font-extrabold">Recent</h2>
          <Link href="/kid/history" className="text-sm font-extrabold text-brand">
            See all
          </Link>
        </div>
        <TxnList rows={recent} tz={ctx.settings.timezone} mode="kid" empty="No Bucks yet. You can do it!" />
      </section>
    </div>
  );
}
