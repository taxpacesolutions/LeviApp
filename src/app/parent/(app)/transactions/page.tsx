import { getParentContext } from "@/lib/context";
import { getLedger, getOverview, LEDGER_FILTERS, type LedgerFilter } from "@/lib/data";
import { FilterChips } from "@/components/FilterChips";
import { PageTitle } from "@/components/PageTitle";
import { TxnList } from "@/components/TxnList";
import { ledgerActions } from "@/components/parent/ledgerActions";
import { SheetButton } from "@/components/ui/Sheet";
import { SetBalancesForm } from "@/components/parent/forms";
import { btn } from "@/components/ui/styles";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "earned", label: "Earned" },
  { key: "spent", label: "Spent" },
  { key: "savings", label: "Savings" },
  { key: "bonuses", label: "Bonuses" },
  { key: "adjustments", label: "Adjustments" },
];

export default async function ParentTransactions({ searchParams }: PageProps<"/parent/transactions">) {
  const ctx = await getParentContext();
  const { filter } = await searchParams;
  const f = (typeof filter === "string" && filter in LEDGER_FILTERS ? filter : "all") as LedgerFilter;
  const [rows, o] = await Promise.all([getLedger(ctx.child.id, f, 500), getOverview(ctx.child.id)]);

  return (
    <div className="space-y-4">
      <PageTitle
        title="Transactions"
        sub={
          <>
            {ctx.child.display_name}: <span className="num">{o.available}</span> available · <span className="num">{o.savings}</span> savings
          </>
        }
        action={
          <SheetButton title="Adjust balances" label="Adjust" className={btn.soft}>
            <SetBalancesForm childId={ctx.child.id} available={o.available} savings={o.savings} allocated={o.allocated} />
          </SheetButton>
        }
      />
      <FilterChips base="/parent/transactions" current={f} options={FILTERS} />
      <p className="px-1 text-xs font-bold text-muted">
        Entries are permanent. Use Edit or Reverse to fix mistakes — both keep an audit trail. Right column shows the balance after each entry.
      </p>
      <TxnList rows={rows} tz={ctx.settings.timezone} mode="parent" rowActions={ledgerActions} />
    </div>
  );
}
