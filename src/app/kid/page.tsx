import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getFamilyContext } from "@/lib/context";
import { getGame, getGoals, getLedger, getOverview, getPendingRequests } from "@/lib/data";
import { percent } from "@/lib/format";
import { BalanceHero } from "@/components/BalanceHero";
import { TxnList } from "@/components/TxnList";
import { GoalVisual } from "@/components/GoalCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LevelCard } from "@/components/game/LevelCard";
import { PetCard } from "@/components/game/PetCard";
import { MissionList } from "@/components/game/MissionList";

export default async function KidHome() {
  const ctx = await getFamilyContext();
  const [o, game, goals, recent, pending] = await Promise.all([
    getOverview(ctx.child.id),
    getGame(ctx.child.id),
    getGoals(ctx.child.id),
    getLedger(ctx.child.id, "all", 3),
    getPendingRequests(ctx.familyId, ctx.child.id),
  ]);
  const goal = goals.find((g) => g.status === "active" && !g.purchased_at);
  const waiting = pending.redemptions.length + pending.transfers.length;
  const open = game.missions.filter((m) => !m.done);
  const doneCount = game.missions.length - open.length;

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

      <LevelCard game={game} compact />
      <PetCard game={game} />

      <section>
        <div className="mb-2 mt-2 flex items-center justify-between px-1">
          <h2 className="text-lg font-extrabold">
            🎯 This week&apos;s missions{" "}
            <span className="num text-sm text-muted">
              {doneCount}/{game.missions.length}
            </span>
          </h2>
          <Link href="/kid/missions" className="text-sm font-extrabold text-brand">
            All missions
          </Link>
        </div>
        {open.length ? (
          <MissionList missions={open.slice(0, 2)} />
        ) : (
          <p className="card bg-mint-soft text-center font-extrabold text-mint-ink shadow-none">
            {game.missions.length ? "All missions done this week! 🏆 New ones on Monday." : "No missions yet."}
          </p>
        )}
      </section>

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

      <section>
        <div className="mb-2 mt-6 flex items-center justify-between px-1">
          <h2 className="text-lg font-extrabold">Recent</h2>
          <Link href="/kid/history" className="text-sm font-extrabold text-brand">
            Your Bucks →
          </Link>
        </div>
        <TxnList rows={recent} tz={ctx.settings.timezone} mode="kid" empty="No Bucks yet. You can do it!" />
      </section>
    </div>
  );
}
