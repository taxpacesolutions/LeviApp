import { getFamilyContext } from "@/lib/context";
import { getGoals, getOverview } from "@/lib/data";
import { GoalCard } from "@/components/GoalCard";
import { PageTitle } from "@/components/PageTitle";
import { SaveRequestButton } from "@/components/kid/SaveRequestButton";

export default async function KidGoals() {
  const ctx = await getFamilyContext();
  const [o, goals] = await Promise.all([getOverview(ctx.child.id), getGoals(ctx.child.id)]);
  const free = o.savings - o.allocated;
  const open = goals.filter((g) => !g.purchased_at);
  const done = goals.filter((g) => g.purchased_at);
  const canMove = o.available - o.pending_transfer_total;

  return (
    <div className="space-y-4">
      <PageTitle title="Goals" sub="Save up for something big!" />

      <section className="card bg-mint-soft shadow-none">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-3xl">🐷</span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-mint-ink">Savings</p>
            <p className="num text-4xl font-black text-mint-ink">{o.savings}</p>
          </div>
          <div className="text-right text-sm font-bold text-mint-ink">
            <p className="num">{o.allocated} for goals</p>
            <p className="num">{free} free</p>
          </div>
        </div>
        <p className="mt-3 text-sm font-semibold text-mint-ink">
          Savings Bucks are safe here. They are for goals, not the store.
        </p>
        <div className="mt-4">
          <SaveRequestButton
            canMove={Math.max(0, canMove)}
            parentTitle={ctx.settings.parent_title}
            goals={open.filter((g) => g.status === "active").map((g) => ({ id: g.id, name: g.name, icon: g.icon, left: g.target_amount - g.saved }))}
          />
          {o.pending_transfers > 0 && (
            <p className="mt-2 text-center text-sm font-bold text-mint-ink">
              ⏳ {o.pending_transfer_total} Bucks waiting for {ctx.settings.parent_title}
            </p>
          )}
        </div>
      </section>

      {open.length === 0 && (
        <p className="card text-center font-bold text-muted">No goals yet. Ask {ctx.settings.parent_title} to add one!</p>
      )}
      {open.map((g) => (
        <GoalCard key={g.id} goal={g} tz={ctx.settings.timezone} />
      ))}

      {done.length > 0 && (
        <>
          <h2 className="px-1 pt-4 text-lg font-extrabold">Goals you finished 🏆</h2>
          {done.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </>
      )}
    </div>
  );
}
