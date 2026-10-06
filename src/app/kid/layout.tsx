import Link from "next/link";
import { Lock } from "lucide-react";
import { getFamilyContext } from "@/lib/context";
import { applyDueSavingsBonuses, getUnseenCelebrations } from "@/lib/data";
import { BottomNav } from "@/components/BottomNav";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { Celebrations } from "@/components/kid/Celebrations";

export default async function KidLayout({ children }: LayoutProps<"/kid">) {
  const ctx = await getFamilyContext();
  // Pays any Savings Bonus that came due (safe to call repeatedly).
  await applyDueSavingsBonuses(ctx.child.id);
  const celebrations = await getUnseenCelebrations(ctx.child.id);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">{ctx.child.avatar_emoji}</span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Reward Bucks</p>
            <p className="text-xl font-black">Hi, {ctx.child.display_name}!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChildSwitcher
            kids={ctx.children.map((c) => ({ id: c.id, name: c.display_name, emoji: c.avatar_emoji }))}
            current={ctx.child.id}
          />
          <Link
            href="/parent"
            aria-label="Parent Mode"
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-extrabold text-muted shadow-sm hover:text-ink"
          >
            <Lock size={14} /> Parent
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <Celebrations key={celebrations.map((c) => c.id).join()} items={celebrations} />
      <BottomNav
        items={[
          { href: "/kid", label: "Home", icon: "home" },
          { href: "/kid/goals", label: "Goals", icon: "goals" },
          { href: "/kid/store", label: "Store", icon: "store" },
          { href: "/kid/badges", label: "Badges", icon: "badges" },
          { href: "/kid/history", label: "History", icon: "history" },
        ]}
      />
    </div>
  );
}
