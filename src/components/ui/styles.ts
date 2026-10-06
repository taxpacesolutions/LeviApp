// Plain class strings (no "use client") so Server and Client Components can both use them.
export const inputCls =
  "w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-base font-semibold text-ink outline-none transition focus:border-brand placeholder:text-muted/60";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-base font-extrabold text-white shadow-sm transition hover:bg-brand-ink active:scale-[0.98] disabled:opacity-50",
  dark: "inline-flex items-center justify-center gap-2 rounded-2xl bg-navy px-5 py-3.5 text-base font-extrabold text-white transition hover:bg-navy-2 active:scale-[0.98] disabled:opacity-50",
  green:
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-mint px-5 py-3.5 text-base font-extrabold text-white transition hover:brightness-95 active:scale-[0.98] disabled:opacity-50",
  soft: "inline-flex items-center justify-center gap-2 rounded-2xl bg-canvas px-4 py-3 text-sm font-extrabold text-ink transition hover:bg-line active:scale-[0.98] disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-2xl bg-coral-soft px-4 py-3 text-sm font-extrabold text-coral-ink transition hover:bg-coral hover:text-white active:scale-[0.98] disabled:opacity-50",
};
