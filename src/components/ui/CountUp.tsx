"use client";

import { useEffect, useRef } from "react";

/** Counts a number up from where it was (or 0) — a little "cha-ching" for balances. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = shown.current;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from === value) {
      el.textContent = String(value);
      shown.current = value;
      return;
    }
    const start = performance.now();
    const dur = Math.min(900, 300 + Math.abs(value - from) * 12);
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else shown.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
