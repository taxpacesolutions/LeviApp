import { getParentContext } from "@/lib/context";
import { getGoals, getOverview } from "@/lib/data";
import { setGoalStatus } from "@/actions/parent";
import { PageTitle } from "@/components/PageTitle";
import { GoalCard } from "@/components/GoalCard";
import { SheetButton } from "@/components/ui/Sheet";
import { GoalForm, GoalMoneyForm, PurchaseGoalForm } from "@/components/parent/forms";
import { HiddenForm } from "@/components/parent/ToggleForm";
import { btn } from "@/components/ui/styles";

const small = "rounded-xl bg-canvas px-3 py-2 text-sm font-extrabold";

export default async function ParentGoals() {
  const ctx = await getParentContext();
  const [goals, o] = await Promise.all([getGoals(ctx.child.id), getOverview(ctx.child.id)]);
  const free = o.savings - o.allocated;

  return (
    <div className="space-y-4">
      <PageTitle
        title="Goals"
        sub={`${ctx.child.display_name}: ${o.savings} in savings · ${o.allocated} for goals · ${free} free`}
        action={
          <SheetButton title="Create Goal" label="+ New" className={btn.primary + " py-2.5"}>
            <GoalForm childId={ctx.child.id} />
          </SheetButton>
        }
      />
      {goals.length === 0 && <p className="card text-center font-bold text-muted">No goals yet.</p>}
      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} tz={ctx.settings.timezone}>
          {!g.purchased_at && (
            <>
              <SheetButton title={`Bucks for ${g.name}`} label="± Bucks" className={small + " bg-mint-soft text-mint-ink"}>
                <GoalMoneyForm goal={g} available={o.available} freeSavings={free} />
              </SheetButton>
              <SheetButton title="Edit Goal" label="Edit" className={small}>
                <GoalForm childId={ctx.child.id} goal={g} />
              </SheetButton>
              {g.status !== "completed" && (
                <HiddenForm action={setGoalStatus} fields={{ id: g.id, status: g.status === "paused" ? "active" : "paused" }} className={small}>
                  {g.status === "paused" ? "Resume" : "Pause"}
                </HiddenForm>
              )}
              {g.saved > 0 && <PurchaseGoalForm goal={g} />}
            </>
          )}
        </GoalCard>
      ))}
    </div>
  );
}
