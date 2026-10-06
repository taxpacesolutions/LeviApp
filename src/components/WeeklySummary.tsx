import { categoryInfo } from "@/lib/categories";
import type { Overview } from "@/lib/types";

export function WeeklySummary({ o }: { o: Overview }) {
  const top = o.week_top_category ? categoryInfo(o.week_top_category) : null;
  return (
    <section className="card">
      <h2 className="text-lg font-extrabold">This Week</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-mint-soft p-3">
          <p className="num text-2xl font-black text-mint-ink">+{o.week_earned}</p>
          <p className="text-xs font-extrabold text-mint-ink">Earned</p>
        </div>
        <div className="rounded-2xl bg-coral-soft p-3">
          <p className="num text-2xl font-black text-coral-ink">{o.week_spent > 0 ? `−${o.week_spent}` : 0}</p>
          <p className="text-xs font-extrabold text-coral-ink">Spent</p>
        </div>
        <div className="rounded-2xl bg-brand-soft p-3">
          <p className="num text-2xl font-black text-brand-ink">{o.week_saved}</p>
          <p className="text-xs font-extrabold text-brand-ink">Saved</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-bold text-muted">
        {top ? (
          <>
            Top earning activity: <span className="text-ink">{top.emoji} {top.label}</span>
          </>
        ) : (
          "A brand-new week — let's earn some Bucks!"
        )}
      </p>
    </section>
  );
}
