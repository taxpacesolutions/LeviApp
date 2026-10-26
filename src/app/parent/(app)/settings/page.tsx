import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getParentContext } from "@/lib/context";
import { getBonusAwards, getBonusRule, getParents } from "@/lib/data";
import { signOut } from "@/actions/auth";
import { PageTitle } from "@/components/PageTitle";
import { SheetButton } from "@/components/ui/Sheet";
import { btn } from "@/components/ui/styles";
import { BonusRuleForm, ChildForm, GeneralSettingsForm, InviteParentForm, PinForm } from "@/components/parent/settings-forms";

function Section({ id, title, sub, children }: { id?: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-4">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {sub && <p className="mb-4 mt-0.5 text-sm font-semibold text-muted">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const ctx = await getParentContext();
  const [rule, awards, parents] = await Promise.all([
    getBonusRule(ctx.familyId),
    getBonusAwards(ctx.child.id),
    getParents(ctx.familyId),
  ]);

  return (
    <div className="space-y-4">
      <PageTitle title="Settings" />

      <Link href="/parent/achievements" className="card flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sun-soft text-2xl">🏅</span>
        <div className="flex-1">
          <p className="font-extrabold">Achievements</p>
          <p className="text-sm font-semibold text-muted">Create badges, give or remove them</p>
        </div>
        <ChevronRight className="text-muted" />
      </Link>

      <Link href="/parent/missions" className="card flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-2xl">🎯</span>
        <div className="flex-1">
          <p className="font-extrabold">Weekly missions</p>
          <p className="text-sm font-semibold text-muted">Challenges that pay a bonus and XP</p>
        </div>
        <ChevronRight className="text-muted" />
      </Link>

      <Section
        title="🐷 Savings Bonus"
        sub="Reward keeping Bucks in savings. Paid once per period, into Savings, based on the lowest savings balance during the last full period."
      >
        <BonusRuleForm rule={rule} />
        {awards.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm font-bold text-muted">
            {awards.map((a) => (
              <li key={a.period_key}>
                {a.period_key}: lowest savings {a.min_balance} → {a.amount > 0 ? `+${a.amount} Bucks` : "no bonus"}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="General">
        <GeneralSettingsForm settings={ctx.settings} familyName={ctx.familyName} />
      </Section>

      <Section id="pin" title="🔒 Parent PIN" sub="4–8 digits. Stored as a secure hash, never in plain text. 5 wrong tries locks it for 5 minutes.">
        <PinForm />
      </Section>

      <Section title="Kids" sub="Each child has their own balance, savings, goals, badges and history.">
        <ul className="space-y-2">
          {ctx.children.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
              <span className="text-2xl">{c.avatar_emoji}</span>
              <p className="flex-1 font-extrabold">{c.display_name}</p>
              <SheetButton title={`Edit ${c.display_name}`} label="Edit" className="rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold">
                <ChildForm child={c} />
              </SheetButton>
            </li>
          ))}
        </ul>
        <SheetButton title="Add a child" label="+ Add child" className={btn.soft + " mt-3 w-full"}>
          <ChildForm />
        </SheetButton>
      </Section>

      <Section title="Parents" sub="People who can sign in and use Parent Mode (with the PIN).">
        <ul className="space-y-2">
          {parents.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
              <span className="text-2xl">{p.avatar_emoji}</span>
              <div className="flex-1">
                <p className="font-extrabold">{p.display_name}</p>
                <p className="text-xs font-bold text-muted">
                  {p.auth_user_id ? (p.auth_user_id === ctx.user.id ? `You · ${ctx.user.email}` : "Linked") : `Waiting for ${p.invite_email ?? "first sign-in"}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <SheetButton title="Add a parent" label="+ Add parent" className={btn.soft + " mt-3 w-full"}>
          <InviteParentForm />
        </SheetButton>
      </Section>

      <form action={signOut}>
        <button className={btn.danger + " w-full py-3.5"}>Sign out of this device</button>
      </form>
    </div>
  );
}
