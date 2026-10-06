"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  CheckCircle2,
  History,
  Home,
  LayoutDashboard,
  ListOrdered,
  Settings,
  ShoppingBag,
  Target,
  Gift,
} from "lucide-react";

const ICONS = {
  home: Home,
  goals: Target,
  store: ShoppingBag,
  badges: Award,
  history: History,
  dashboard: LayoutDashboard,
  transactions: ListOrdered,
  rewards: Gift,
  approvals: CheckCircle2,
  settings: Settings,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const root = items[0].href;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((it) => {
          const active = it.href === root ? path === root : path.startsWith(it.href);
          const Icon = ICONS[it.icon];
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-extrabold transition ${
                  active ? "text-brand" : "text-muted hover:text-ink"
                }`}
              >
                <span className={`grid h-8 w-12 place-items-center rounded-full transition ${active ? "bg-brand-soft" : ""}`}>
                  <Icon size={21} strokeWidth={active ? 2.6 : 2.2} />
                </span>
                {it.label}
                {!!it.badge && (
                  <span className="absolute right-[calc(50%-22px)] top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-black text-white">
                    {it.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
