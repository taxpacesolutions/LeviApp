"use client";

import { useTransition } from "react";
import { switchChild } from "@/actions/kid";

export function ChildSwitcher({
  kids,
  current,
  dark = false,
}: {
  kids: { id: string; name: string; emoji: string }[];
  current: string;
  dark?: boolean;
}) {
  const [pending, start] = useTransition();
  if (kids.length < 2) return null;
  return (
    <select
      aria-label="Choose child"
      disabled={pending}
      value={current}
      onChange={(e) => start(() => switchChild(e.target.value))}
      className={`rounded-full px-3 py-1.5 text-sm font-extrabold outline-none ${dark ? "bg-white/15 text-white" : "bg-canvas text-ink"}`}
    >
      {kids.map((k) => (
        <option key={k.id} value={k.id} className="text-ink">
          {k.emoji} {k.name}
        </option>
      ))}
    </select>
  );
}
