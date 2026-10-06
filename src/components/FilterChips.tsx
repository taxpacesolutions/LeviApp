import Link from "next/link";

export function FilterChips({
  base,
  current,
  options,
}: {
  base: string;
  current: string;
  options: { key: string; label: string }[];
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {options.map((o) => {
        const on = o.key === current;
        return (
          <Link
            key={o.key}
            href={o.key === "all" ? base : `${base}?filter=${o.key}`}
            scroll={false}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition ${
              on ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
