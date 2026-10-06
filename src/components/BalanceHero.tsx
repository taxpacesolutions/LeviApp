import { PiggyBank, Wallet } from "lucide-react";

export function BalanceHero({
  available,
  savings,
  name,
  compact = false,
}: {
  available: number;
  savings: number;
  name?: string;
  compact?: boolean;
}) {
  const total = available + savings;
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-navy p-6 text-white shadow-lg">
      <div aria-hidden className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-brand/40 blur-2xl" />
      <div aria-hidden className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-mint/25 blur-2xl" />
      <div className="relative">
        <p className="text-sm font-bold text-white/70">{name ? `${name}'s Reward Bucks` : "Total Reward Bucks"}</p>
        <p className={`num mt-1 font-black ${compact ? "text-5xl" : "text-7xl"}`}>
          {total}
          <span className="ml-2 text-xl font-extrabold text-sun">Bucks</span>
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/10 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-white/75">
              <Wallet size={14} /> Available to spend
            </p>
            <p className="num mt-0.5 text-3xl font-black">{available}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-white/75">
              <PiggyBank size={14} /> Savings
            </p>
            <p className="num mt-0.5 text-3xl font-black text-[#7ee2a8]">{savings}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
