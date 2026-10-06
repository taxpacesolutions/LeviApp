import Link from "next/link";
import { getParentContext } from "@/lib/context";
import { getAchievements } from "@/lib/data";
import { awardAchievement } from "@/actions/parent";
import { PageTitle } from "@/components/PageTitle";
import { SheetButton } from "@/components/ui/Sheet";
import { AchievementForm } from "@/components/parent/settings-forms";
import { HiddenForm } from "@/components/parent/ToggleForm";
import { btn } from "@/components/ui/styles";
import { categoryInfo, RULE_LABELS } from "@/lib/categories";

export default async function ManageAchievements() {
  const ctx = await getParentContext();
  const badges = await getAchievements(ctx.familyId, ctx.child.id, true);

  return (
    <div className="space-y-4">
      <Link href="/parent/settings" className="text-sm font-extrabold text-brand">
        ← Settings
      </Link>
      <PageTitle
        title="Achievements"
        sub={`Showing ${ctx.child.display_name}'s badges`}
        action={
          <SheetButton title="New badge" label="+ New" className={btn.primary + " py-2.5"}>
            <AchievementForm />
          </SheetButton>
        }
      />
      <ul className="space-y-3">
        {badges.map((b) => (
          <li key={b.id} className={`card flex items-center gap-3 p-4 ${b.active ? "" : "opacity-60"}`}>
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl ${b.unlocked_at ? "bg-sun-soft ring-2 ring-sun" : "bg-canvas grayscale"}`}>
              {b.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">
                {b.name} {!b.active && <span className="text-xs text-muted">(inactive)</span>}
              </p>
              <p className="text-xs font-bold text-muted">
                {RULE_LABELS[b.rule_type].replace("…", "")}
                {b.rule_type !== "manual" && ` ${b.threshold}`}
                {b.category && ` · ${categoryInfo(b.category).label}`}
              </p>
              <p className={`text-xs font-extrabold ${b.unlocked_at ? "text-mint-ink" : "text-muted"}`}>{b.unlocked_at ? "Unlocked ✓" : "Locked"}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <SheetButton title="Edit badge" label="Edit" className="rounded-xl bg-canvas px-3 py-1.5 text-xs font-extrabold">
                <AchievementForm a={b} />
              </SheetButton>
              <HiddenForm
                action={awardAchievement}
                fields={{ id: b.id, child_id: ctx.child.id, op: b.unlocked_at ? "revoke" : "award" }}
                confirm={b.unlocked_at ? `Remove “${b.name}” from ${ctx.child.display_name}?` : undefined}
                className="w-full rounded-xl bg-canvas px-3 py-1.5 text-xs font-extrabold text-muted"
              >
                {b.unlocked_at ? "Remove" : "Give"}
              </HiddenForm>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
