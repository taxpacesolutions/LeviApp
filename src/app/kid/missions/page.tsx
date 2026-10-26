import { getFamilyContext } from "@/lib/context";
import { getGame, getOverview } from "@/lib/data";
import { PageTitle } from "@/components/PageTitle";
import { MissionList } from "@/components/game/MissionList";
import { LevelCard } from "@/components/game/LevelCard";
import { WeeklySummary } from "@/components/WeeklySummary";
import { StreakList } from "@/components/Streaks";

export default async function KidMissions() {
  const ctx = await getFamilyContext();
  const [game, o] = await Promise.all([getGame(ctx.child.id), getOverview(ctx.child.id)]);
  const done = game.missions.filter((m) => m.done).length;

  return (
    <div className="space-y-4">
      <PageTitle title="Missions" sub={`${done} of ${game.missions.length} done · new missions every Monday`} />
      <MissionList missions={game.missions} empty={`No missions yet. Ask ${ctx.settings.parent_title} to add some!`} />
      <LevelCard game={game} />
      <WeeklySummary o={o} />
      <section className="card">
        <h2 className="mb-3 text-lg font-extrabold">🔥 Streaks</h2>
        <StreakList streaks={o.streaks} tracked={ctx.settings.streak_categories} />
        <p className="mt-3 text-xs font-bold text-muted">Every day is a fresh chance. Do your best!</p>
      </section>
    </div>
  );
}
