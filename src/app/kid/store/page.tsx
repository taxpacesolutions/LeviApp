import { getFamilyContext } from "@/lib/context";
import { getOverview, getPendingRequests, getRewards } from "@/lib/data";
import { PageTitle } from "@/components/PageTitle";
import { RewardTile } from "@/components/kid/RewardTile";
import { CancelRequestButton } from "@/components/kid/CancelRequestButton";

export default async function KidStore() {
  const ctx = await getFamilyContext();
  const [o, rewards, pending] = await Promise.all([
    getOverview(ctx.child.id),
    getRewards(ctx.familyId, ctx.child.id),
    getPendingRequests(ctx.familyId, ctx.child.id),
  ]);
  const spendable = Math.max(0, o.available - o.pending_redemption_total);

  return (
    <div className="space-y-4">
      <PageTitle title="Reward Store" sub="Spend your Bucks on something fun." />

      <section className="card flex items-center gap-4 bg-brand-soft shadow-none">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl">👛</span>
        <div>
          <p className="text-sm font-extrabold text-brand-ink">You can spend</p>
          <p className="num text-4xl font-black text-brand-ink">
            {spendable} <span className="text-lg">Bucks</span>
          </p>
        </div>
      </section>

      {pending.redemptions.length > 0 && (
        <section className="card bg-sun-soft shadow-none">
          <h2 className="font-extrabold text-sun-ink">⏳ Waiting for {ctx.settings.parent_title}</h2>
          <ul className="mt-2 space-y-2">
            {pending.redemptions.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5">
                <span className="text-2xl">{r.reward_icon}</span>
                <p className="flex-1 font-extrabold">{r.reward_name}</p>
                <span className="num font-black">{r.cost}</span>
                <CancelRequestButton id={r.id} kind="redemption" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rewards.length === 0 ? (
        <p className="card text-center font-bold text-muted">The store is empty right now.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rewards.map((r) => (
            <RewardTile key={r.id} reward={r} spendable={spendable} parentTitle={ctx.settings.parent_title} />
          ))}
        </ul>
      )}
    </div>
  );
}
