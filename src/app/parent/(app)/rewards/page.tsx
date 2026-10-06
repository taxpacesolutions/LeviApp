import { getParentContext } from "@/lib/context";
import { getRewards } from "@/lib/data";
import { toggleReward } from "@/actions/parent";
import { PageTitle } from "@/components/PageTitle";
import { SheetButton } from "@/components/ui/Sheet";
import { RewardForm } from "@/components/parent/forms";
import { HiddenForm } from "@/components/parent/ToggleForm";
import { RewardArt } from "@/components/kid/RewardTile";
import { btn } from "@/components/ui/styles";

export default async function ParentRewards() {
  const ctx = await getParentContext();
  const rewards = await getRewards(ctx.familyId, null, true);

  return (
    <div className="space-y-4">
      <PageTitle
        title="Rewards"
        sub="What Bucks can buy in the store."
        action={
          <SheetButton title="Create Reward" label="+ New" className={btn.primary + " py-2.5"}>
            <RewardForm />
          </SheetButton>
        }
      />
      {rewards.length === 0 && <p className="card text-center font-bold text-muted">No rewards yet.</p>}
      <ul className="space-y-3">
        {rewards.map((r) => (
          <li key={r.id} className={`card flex items-center gap-4 p-4 ${r.active ? "" : "opacity-60"}`}>
            <RewardArt reward={r} size={52} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">
                {r.name} {!r.active && <span className="ml-1 rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">Hidden</span>}
              </p>
              <p className="truncate text-sm font-semibold text-muted">{r.description || "—"}</p>
            </div>
            <p className="num shrink-0 rounded-full bg-sun-soft px-3 py-1 text-sm font-black text-sun-ink">{r.cost}</p>
            <div className="flex shrink-0 flex-col gap-1.5">
              <SheetButton title="Edit Reward" label="Edit" className="rounded-xl bg-canvas px-3 py-1.5 text-xs font-extrabold">
                <RewardForm reward={r} />
              </SheetButton>
              <HiddenForm
                action={toggleReward}
                fields={{ id: r.id, active: r.active ? "false" : "true" }}
                className="w-full rounded-xl bg-canvas px-3 py-1.5 text-xs font-extrabold text-muted"
              >
                {r.active ? "Hide" : "Show"}
              </HiddenForm>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
