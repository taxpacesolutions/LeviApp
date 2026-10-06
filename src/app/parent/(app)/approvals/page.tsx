import { getParentContext } from "@/lib/context";
import { getGoals, getOverview, getPendingRequests, getRecentDecisions } from "@/lib/data";
import { decideRequest } from "@/actions/parent";
import { PageTitle } from "@/components/PageTitle";
import { ActionForm } from "@/components/ui/ActionForm";
import { btn } from "@/components/ui/styles";
import { fmtDateTime } from "@/lib/format";

function Decide({ id, kind }: { id: string; kind: "redemption" | "transfer" }) {
  return (
    <ActionForm action={decideRequest} className="mt-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 gap-2">
        <button name="decision" value="decline" className={btn.soft}>
          Decline
        </button>
        <button name="decision" value="approve" className={btn.green + " py-3 text-sm"}>
          Approve
        </button>
      </div>
    </ActionForm>
  );
}

const STATUS = {
  approved: "bg-mint-soft text-mint-ink",
  declined: "bg-coral-soft text-coral-ink",
  cancelled: "bg-canvas text-muted",
  pending: "bg-sun-soft text-sun-ink",
};

export default async function Approvals() {
  const ctx = await getParentContext();
  const tz = ctx.settings.timezone;
  const [pending, recent] = await Promise.all([getPendingRequests(ctx.familyId), getRecentDecisions(ctx.familyId)]);
  const names = new Map(ctx.children.map((c) => [c.id, c.display_name]));
  const childIds = [...new Set([...pending.redemptions, ...pending.transfers].map((r) => r.child_id))];
  const overviews = new Map(await Promise.all(childIds.map(async (id) => [id, await getOverview(id)] as const)));
  const goals = new Map((await Promise.all(childIds.map(getGoals))).flat().map((g) => [g.id, g]));
  const none = pending.redemptions.length + pending.transfers.length === 0;

  const history = [
    ...recent.redemptions.map((r) => ({ id: r.id, at: r.decided_at ?? r.requested_at, child: r.child_id, text: `${r.reward_icon} ${r.reward_name} (${r.cost})`, status: r.status })),
    ...recent.transfers.map((t) => ({ id: t.id, at: t.decided_at ?? t.requested_at, child: t.child_id, text: `🐷 Save ${t.amount}`, status: t.status })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 15);

  return (
    <div className="space-y-4">
      <PageTitle title="Approvals" sub="Requests from the kids." />
      {none && <p className="card text-center font-bold text-muted">All caught up! 🎉</p>}

      {pending.redemptions.map((r) => {
        const o = overviews.get(r.child_id);
        const enough = (o?.available ?? 0) >= r.cost;
        return (
          <article key={r.id} className="card">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sun-soft text-2xl">{r.reward_icon}</span>
              <div className="flex-1">
                <p className="font-extrabold">{r.reward_name}</p>
                <p className="text-sm font-bold text-muted">
                  {names.get(r.child_id)} · {fmtDateTime(r.requested_at, tz)}
                </p>
              </div>
              <p className="num text-xl font-black text-coral-ink">−{r.cost}</p>
            </div>
            <p className={`mt-2 text-sm font-bold ${enough ? "text-muted" : "text-coral-ink"}`}>
              Available: {o?.available ?? 0} {enough ? `→ ${(o?.available ?? 0) - r.cost} after` : "— not enough right now"}
            </p>
            <Decide id={r.id} kind="redemption" />
          </article>
        );
      })}

      {pending.transfers.map((t) => {
        const goal = t.goal_id ? goals.get(t.goal_id) : null;
        return (
          <article key={t.id} className="card">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-soft text-2xl">🐷</span>
              <div className="flex-1">
                <p className="font-extrabold">Move to savings{goal ? ` for ${goal.icon} ${goal.name}` : ""}</p>
                <p className="text-sm font-bold text-muted">
                  {names.get(t.child_id)} · {fmtDateTime(t.requested_at, tz)}
                </p>
              </div>
              <p className="num text-xl font-black text-brand-ink">→ {t.amount}</p>
            </div>
            <Decide id={t.id} kind="transfer" />
          </article>
        );
      })}

      {history.length > 0 && (
        <section className="pt-4">
          <h2 className="mb-2 px-1 text-lg font-extrabold">Recently decided</h2>
          <ul className="card divide-y divide-line p-0">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                <p className="flex-1 truncate text-sm font-bold">
                  {h.text} <span className="text-muted">· {names.get(h.child)}</span>
                </p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold capitalize ${STATUS[h.status]}`}>{h.status}</span>
                <span className="text-xs font-bold text-muted">{fmtDateTime(h.at, tz)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
