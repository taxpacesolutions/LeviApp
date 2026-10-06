import type { ReactNode } from "react";

const TONES = {
  brand: "bg-brand-soft text-brand-ink",
  mint: "bg-mint-soft text-mint-ink",
  sun: "bg-sun-soft text-sun-ink",
  coral: "bg-coral-soft text-coral-ink",
};

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "brand",
  children,
}: {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
  sub?: ReactNode;
  tone?: keyof typeof TONES;
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-col">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${TONES[tone]}`}>{icon}</span>
        <p className="text-sm font-extrabold text-muted">{label}</p>
      </div>
      {value !== undefined && <p className="num mt-3 text-3xl font-black">{value}</p>}
      {sub && <p className="mt-0.5 text-sm font-semibold text-muted">{sub}</p>}
      {children}
    </div>
  );
}
