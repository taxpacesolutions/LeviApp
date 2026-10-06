import { TxnRowActions } from "@/components/parent/TxnRowActions";
import { EARN_CATEGORIES } from "@/lib/categories";
import type { LedgerRow } from "@/lib/types";

/** Edit / Reverse buttons for one ledger row (Parent Mode only). */
export function ledgerActions(t: LedgerRow) {
  if (t.is_reversed || t.type === "reversal") return null;
  return (
    <TxnRowActions
      txn={{
        id: t.id,
        description: t.description,
        category: t.category,
        amount: Math.abs(t.available_delta + t.savings_delta),
        editable: ["earn", "spend", "bonus", "adjustment"].includes(t.type) && t.savings_delta === 0 && !t.goal_id,
        isEarn: t.available_delta > 0,
      }}
      earnCategories={EARN_CATEGORIES}
    />
  );
}
