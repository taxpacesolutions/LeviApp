import Link from "next/link";
import { getParentContext } from "@/lib/context";
import { getGame, getMissions } from "@/lib/data";
import { PageTitle } from "@/components/PageTitle";
import { SheetButton } from "@/components/ui/Sheet";
import { btn } from "@/components/ui/styles";
import { MissionForm } from "@/components/parent/MissionForm";
import { MISSION_KINDS, categoryInfo } from "@/lib/categories";

export default async function ParentMissions() {
  const ctx = await getParentContext();
  const [missions, game] = await Promise.all([getMissions(ctx.familyId), getGame(ctx.child.id)]);
  const progress = new Map(game.missions.map((m) => [m.id, m]));

  return (
    <div className="space-y-4">
      <Link href="/parent/settings" className="text-sm font-extrabold text-brand">
        ← Settings
      </Link>
      <PageTitle
        title="Missions"
        sub="Weekly challenges. They reset every Monday and pay their bonus automatically."
        action={
          <SheetButton title="New mission" label="+ New" className={btn.primary + " py-2.5"}>
            <MissionForm />
          </SheetButton>
        }
      />
      {missions.length === 0 && <p className="card text-center font-bold text-muted">No missions yet.</p>}
      <ul className="space-y-3">
        {missions.map((m) => {
          const p = progress.get(m.id);
          return (
            <li key={m.id} className={`card flex items-center gap-3 p-4 ${m.active ? "" : "opacity-60"}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sun-soft text-2xl">{m.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">
                  {m.title} {!m.active && <span className="text-xs text-muted">(off)</span>}
                </p>
                <p className="text-xs font-bold text-muted">
                  {MISSION_KINDS[m.kind]}: {m.target}
                  {m.category && ` · ${categoryInfo(m.category).label}`} · +{m.reward_bucks} Bucks · +{m.reward_xp} XP
                </p>
                {p && (
                  <p className={`text-xs font-extrabold ${p.done ? "text-mint-ink" : "text-muted"}`}>
                    This week: {p.done ? "done ✓" : `${p.progress}/${p.target}`}
                  </p>
                )}
              </div>
              <SheetButton title="Edit mission" label="Edit" className="rounded-xl bg-canvas px-3 py-1.5 text-xs font-extrabold">
                <MissionForm m={m} />
              </SheetButton>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
