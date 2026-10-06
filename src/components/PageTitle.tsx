import type { ReactNode } from "react";

export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 font-bold text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
