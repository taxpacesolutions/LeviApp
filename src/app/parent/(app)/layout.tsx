import Link from "next/link";
import { Lock } from "lucide-react";
import { getParentContext } from "@/lib/context";
import { getPendingRequests } from "@/lib/data";
import { lockParent } from "@/actions/parent";
import { BottomNav } from "@/components/BottomNav";
import { ChildSwitcher } from "@/components/ChildSwitcher";

export default async function ParentLayout({ children }: LayoutProps<"/parent">) {
  const ctx = await getParentContext();
  const pending = await getPendingRequests(ctx.familyId);
  const count = pending.redemptions.length + pending.transfers.length;

  return (
    <div className="min-h-dvh">
      <header className="bg-navy pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-white/60">Parent Mode</p>
            <p className="text-lg font-black">{ctx.familyName}</p>
          </div>
          <div className="flex items-center gap-2">
            <ChildSwitcher
              dark
              kids={ctx.children.map((c) => ({ id: c.id, name: c.display_name, emoji: c.avatar_emoji }))}
              current={ctx.child.id}
            />
            <form action={lockParent}>
              <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-xs font-extrabold hover:bg-white/25">
                <Lock size={14} /> Lock
              </button>
            </form>
          </div>
        </div>
      </header>
      {ctx.settings.pin_is_default && (
        <Link href="/parent/settings#pin" className="block bg-sun px-4 py-2.5 text-center text-sm font-extrabold text-navy">
          ⚠️ You&apos;re using the default PIN (1234). Tap to change it.
        </Link>
      )}
      <div className="mx-auto max-w-2xl px-4 pb-28 pt-5">{children}</div>
      <BottomNav
        items={[
          { href: "/parent", label: "Dashboard", icon: "dashboard" },
          { href: "/parent/transactions", label: "History", icon: "transactions" },
          { href: "/parent/rewards", label: "Rewards", icon: "rewards" },
          { href: "/parent/goals", label: "Goals", icon: "goals" },
          { href: "/parent/approvals", label: "Approvals", icon: "approvals", badge: count },
          { href: "/parent/settings", label: "Settings", icon: "settings" },
        ]}
      />
    </div>
  );
}
