import { getFamilyContext } from "@/lib/context";
import { getAchievements, getOverview } from "@/lib/data";
import { BadgeGrid } from "@/components/BadgeGrid";
import { PageTitle } from "@/components/PageTitle";
import { StreakList } from "@/components/Streaks";

export default async function KidBadges() {
  const ctx = await getFamilyContext();
  const [badges, o] = await Promise.all([getAchievements(ctx.familyId, ctx.child.id), getOverview(ctx.child.id)]);
  const unlocked = badges.filter((b) => b.unlocked_at).length;
  const sorted = [...badges].sort((a, b) => Number(!!b.unlocked_at) - Number(!!a.unlocked_at));

  return (
    <div className="space-y-6">
      <PageTitle title="Badges" sub={`You have ${unlocked} of ${badges.length} badges!`} />

      <section className="card">
        <h2 className="mb-3 text-lg font-extrabold">🔥 Streaks</h2>
        <StreakList streaks={o.streaks} tracked={ctx.settings.streak_categories} />
        <p className="mt-3 text-xs font-bold text-muted">Every day is a fresh chance. Do your best!</p>
      </section>

      <BadgeGrid badges={sorted} tz={ctx.settings.timezone} />
    </div>
  );
}
