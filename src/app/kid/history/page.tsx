import { getFamilyContext } from "@/lib/context";
import { getLedger, LEDGER_FILTERS, type LedgerFilter } from "@/lib/data";
import { FilterChips } from "@/components/FilterChips";
import { PageTitle } from "@/components/PageTitle";
import { TxnList } from "@/components/TxnList";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "earned", label: "Earned" },
  { key: "spent", label: "Spent" },
  { key: "savings", label: "Savings" },
  { key: "bonuses", label: "Bonuses" },
];

export default async function KidHistory({ searchParams }: PageProps<"/kid/history">) {
  const ctx = await getFamilyContext();
  const { filter } = await searchParams;
  const f = (typeof filter === "string" && filter in LEDGER_FILTERS ? filter : "all") as LedgerFilter;
  const rows = await getLedger(ctx.child.id, f, 150);

  return (
    <div className="space-y-4">
      <PageTitle title="Your Bucks" sub="Everything you earned, saved and spent." />
      <FilterChips base="/kid/history" current={f} options={FILTERS} />
      <TxnList rows={rows} tz={ctx.settings.timezone} mode="kid" empty="Nothing here yet." />
    </div>
  );
}
