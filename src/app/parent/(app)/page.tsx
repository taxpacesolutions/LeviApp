import Link from "next/link";
import { getParentContext } from "@/lib/context";
import { getGame, getLedger, getOverview, getPendingRequests } from "@/lib/data";
import { BalanceHero } from "@/components/BalanceHero";
import { QuickActions } from "@/components/parent/QuickActions";
import { WeeklySummary } from "@/components/WeeklySummary";
import { StreakList } from "@/components/Streaks";
import { TxnList } from "@/components/TxnList";
import { ledgerActions } from "@/components/parent/ledgerActions";

export default async function ParentDashboard() {
  const ctx = await getParentContext();
  const [o, game, recent, pending] = await Promise.all([
    getOverview(ctx.child.id),
    getGame(ctx.child.id),
    getLedger(ctx.child.id, "all", 8),
    getPendingRequests(ctx.familyId),
  ]);
  const pendingCount = pending.redemptions.length + pending.transfers.length;

  return (
    <div className="space-y-5">
      <BalanceHero available={o.available} savings={o.savings} name={ctx.child.display_name} compact />
      <Link href="/parent/missions" className="card flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm font-extrabold">
        <span>
          {game.level.emoji} Level {game.level.level} · {game.level.title}
        </span>
        <span className="text-muted">
          {game.pet.emoji} {game.pet_name} the {game.pet.name}
        </span>
        <span className="text-muted">
          🎯 {game.missions.filter((m) => m.done).length}/{game.missions.length} missions this week
        </span>
      </Link>
      {o.allocated > 0 && (
        <p className="-mt-2 px-1 text-sm font-bold text-muted">
          {o.allocated} of {o.savings} savings Bucks are set aside for goals.
        </p>
      )}

      <QuickActions
        childId={ctx.child.id}
        childName={ctx.child.display_name}
        presets={ctx.settings.earn_presets}
        available={o.available}
        freeSavings={o.savings - o.allocated}
        pendingCount={pendingCount}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <WeeklySummary o={o} />
        <section className="card">
          <h2 className="mb-3 text-lg font-extrabold">Streaks</h2>
          <StreakList streaks={o.streaks} tracked={ctx.settings.streak_categories} />
          <p className="mt-3 text-sm font-bold text-muted">Lifetime earned: <span className="num text-ink">{o.lifetime_earned}</span></p>
        </section>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-lg font-extrabold">Recent activity</h2>
          <Link href="/parent/transactions" className="text-sm font-extrabold text-brand">
            Full history
          </Link>
        </div>
        <TxnList rows={recent} tz={ctx.settings.timezone} mode="parent" rowActions={ledgerActions} />
      </section>
    </div>
  );
}
