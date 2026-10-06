"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SheetButton } from "@/components/ui/Sheet";
import { DeductForm, EarnForm, GoalForm, MoveForm, RewardForm } from "@/components/parent/forms";

const tile =
  "flex min-h-24 flex-col items-start justify-between gap-2 rounded-3xl p-4 text-left font-black shadow-sm transition active:scale-[0.98]";

function Tile({ emoji, label, sub }: { emoji: string; label: string; sub?: ReactNode }) {
  return (
    <>
      <span className="text-2xl">{emoji}</span>
      <span>
        <span className="block text-base leading-tight">{label}</span>
        {sub && <span className="block text-xs font-bold opacity-75">{sub}</span>}
      </span>
    </>
  );
}

export function QuickActions({
  childId,
  childName,
  presets,
  available,
  freeSavings,
  pendingCount,
}: {
  childId: string;
  childName: string;
  presets: number[];
  available: number;
  freeSavings: number;
  pendingCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <SheetButton title={`Earn Bucks for ${childName}`} className={`${tile} col-span-2 bg-mint text-white sm:col-span-1`} label={<Tile emoji="➕" label="Add Bucks" sub="Earned something" />}>
        <EarnForm childId={childId} childName={childName} presets={presets} />
      </SheetButton>
      <SheetButton title="Deduct Bucks" className={`${tile} bg-white`} label={<Tile emoji="➖" label="Deduct Bucks" />}>
        <DeductForm childId={childId} available={available} />
      </SheetButton>
      <SheetButton title="Move Bucks" className={`${tile} bg-white`} label={<Tile emoji="🐷" label="Move to Savings" />}>
        <MoveForm childId={childId} available={available} freeSavings={freeSavings} />
      </SheetButton>
      <SheetButton title="Create Reward" className={`${tile} bg-white`} label={<Tile emoji="🎁" label="Create Reward" />}>
        <RewardForm />
      </SheetButton>
      <SheetButton title="Create Goal" className={`${tile} bg-white`} label={<Tile emoji="🎯" label="Create Goal" />}>
        <GoalForm childId={childId} />
      </SheetButton>
      <Link href="/parent/approvals" className={`${tile} ${pendingCount ? "bg-sun text-navy" : "bg-white"}`}>
        <Tile emoji="✅" label="Approve Requests" sub={pendingCount ? `${pendingCount} waiting` : "All caught up"} />
      </Link>
      <Link href="/parent/transactions" className={`${tile} bg-white`}>
        <Tile emoji="📒" label="View History" />
      </Link>
    </div>
  );
}
