import type { LedgerRow } from "./types";

export function fmtBucks(n: number) {
  return `${n.toLocaleString("en-US")} ${Math.abs(n) === 1 ? "Buck" : "Bucks"}`;
}

export function signed(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

export function fmtDate(iso: string, tz: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", ...opts }).format(
    new Date(iso),
  );
}

export function fmtDateTime(iso: string, tz: string) {
  return fmtDate(iso, tz, { hour: "numeric", minute: "2-digit" });
}

/** Group label like "Today", "Yesterday", "Mon, Oct 5" in the family's timezone. */
export function dayLabel(iso: string, tz: string) {
  const key = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  const today = key(new Date());
  const yesterday = key(new Date(Date.now() - 86_400_000));
  const k = key(new Date(iso));
  if (k === today) return "Today";
  if (k === yesterday) return "Yesterday";
  return fmtDate(iso, tz, { weekday: "short" });
}

export type TxnTone = "earn" | "spend" | "move" | "fix";

/** How a ledger row should look: green for earned, red for spent, blue for moves. */
export function txnTone(t: Pick<LedgerRow, "type" | "available_delta" | "savings_delta">): TxnTone {
  if (t.type === "transfer_to_savings" || t.type === "transfer_from_savings") return "move";
  if (t.type === "adjustment" || t.type === "reversal") return "fix";
  return t.available_delta + t.savings_delta >= 0 ? "earn" : "spend";
}

/** The number to show for a row. Transfers show the moved amount. */
export function txnAmount(t: Pick<LedgerRow, "type" | "available_delta" | "savings_delta">) {
  if (t.type === "transfer_to_savings" || t.type === "transfer_from_savings") return Math.abs(t.savings_delta);
  return t.available_delta + t.savings_delta;
}

export const TYPE_LABEL: Record<string, string> = {
  earn: "Earned",
  spend: "Spent",
  transfer_to_savings: "To savings",
  transfer_from_savings: "From savings",
  bonus: "Bonus",
  adjustment: "Adjustment",
  reversal: "Reversal",
};

export function percent(saved: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((saved / target) * 100)));
}
