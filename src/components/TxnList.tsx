import type { ReactNode } from "react";
import { categoryInfo } from "@/lib/categories";
import { dayLabel, fmtDateTime, signed, txnAmount, txnTone, TYPE_LABEL } from "@/lib/format";
import type { LedgerRow } from "@/lib/types";

const TONE = {
  earn: { badge: "bg-mint-soft", amount: "text-mint-ink", dot: "bg-mint" },
  spend: { badge: "bg-coral-soft", amount: "text-coral-ink", dot: "bg-coral" },
  move: { badge: "bg-brand-soft", amount: "text-brand-ink", dot: "bg-brand" },
  fix: { badge: "bg-canvas", amount: "text-muted", dot: "bg-muted" },
};

function kidLine(t: LedgerRow) {
  if (t.type === "transfer_to_savings") return "Moved to savings 🐷";
  if (t.type === "transfer_from_savings") return "Moved out of savings";
  return null;
}

export function TxnList({
  rows,
  tz,
  mode,
  empty = "Nothing here yet.",
  rowActions,
}: {
  rows: LedgerRow[];
  tz: string;
  mode: "kid" | "parent";
  empty?: string;
  /** Parent pages pass this in so Kid Mode never ships admin controls. */
  rowActions?: (t: LedgerRow) => ReactNode;
}) {
  if (!rows.length) {
    return <p className="card text-center font-bold text-muted">{empty}</p>;
  }
  const groups: { label: string; rows: LedgerRow[] }[] = [];
  for (const r of rows) {
    const label = dayLabel(r.created_at, tz);
    const g = groups[groups.length - 1];
    if (g?.label === label) g.rows.push(r);
    else groups.push({ label, rows: [r] });
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.label + g.rows[0].id}>
          <h3 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-muted">{g.label}</h3>
          <ul className="card divide-y divide-line p-0">
            {g.rows.map((t) => {
              const tone = TONE[txnTone(t)];
              const amt = txnAmount(t);
              const cat = categoryInfo(t.category);
              const isMove = t.type === "transfer_to_savings" || t.type === "transfer_from_savings";
              return (
                <li key={t.id} className={`px-4 py-3.5 ${t.is_reversed ? "opacity-55" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${tone.badge}`}>{cat.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-extrabold ${t.is_reversed ? "line-through" : ""}`}>{t.description}</p>
                      <p className="truncate text-xs font-bold text-muted">
                        {mode === "kid" ? (
                          kidLine(t) ??
                          (cat.label.toLowerCase() === t.description.toLowerCase()
                            ? fmtDateTime(t.created_at, tz)
                            : cat.label)
                        ) : (
                          <>
                            {TYPE_LABEL[t.type]} · {cat.label} · {fmtDateTime(t.created_at, tz)} · by {t.created_by_label}
                          </>
                        )}
                        {t.is_reversed && " · reversed"}
                      </p>
                      {mode === "parent" && t.note && <p className="mt-0.5 text-xs font-semibold text-muted">“{t.note}”</p>}
                    </div>
                    <div className="text-right">
                      <p className={`num text-lg font-black ${tone.amount}`}>{isMove ? `${t.type === "transfer_to_savings" ? "→" : "←"} ${amt}` : signed(amt)}</p>
                      {mode === "parent" ? (
                        <p className="num text-[11px] font-bold text-muted">
                          {t.available_after} avail · {t.savings_after} saved
                        </p>
                      ) : (
                        <p className="num text-[11px] font-bold text-muted">= {t.available_after + t.savings_after}</p>
                      )}
                    </div>
                  </div>
                  {rowActions?.(t)}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
