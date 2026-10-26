import { getFamilyContext } from "@/lib/context";
import { getAchievements, getGame } from "@/lib/data";
import { BadgeGrid } from "@/components/BadgeGrid";
import { PageTitle } from "@/components/PageTitle";
import { LevelCard } from "@/components/game/LevelCard";

export default async function KidBadges() {
  const ctx = await getFamilyContext();
  const [badges, game] = await Promise.all([getAchievements(ctx.familyId, ctx.child.id), getGame(ctx.child.id)]);
  const unlocked = badges.filter((b) => b.unlocked_at).length;
  const sorted = [...badges].sort((a, b) => Number(!!b.unlocked_at) - Number(!!a.unlocked_at));

  return (
    <div className="space-y-6">
      <PageTitle title="Badges" sub={`You have ${unlocked} of ${badges.length} badges!`} />

      <LevelCard game={game} />

      <BadgeGrid badges={sorted} tz={ctx.settings.timezone} />
    </div>
  );
}
