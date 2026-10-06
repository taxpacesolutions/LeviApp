"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { unlockParent } from "@/actions/parent";

export function PinPad() {
  const [pin, setPin] = useState("");
  const [state, action, pending] = useActionState(unlockParent, null);

  const submit = (value: string) => {
    const fd = new FormData();
    fd.set("pin", value);
    setPin("");
    startTransition(() => action(fd));
  };

  const press = (d: string) => {
    if (pending) return;
    setPin((p) => (p.length < 8 ? p + d : p));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter" && pin.length >= 4) submit(pin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div>
      <div className="mb-4 flex justify-center gap-3" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full transition ${i < pin.length ? "scale-110 bg-navy" : "bg-line"}`} />
        ))}
      </div>
      <p role="alert" className="mb-3 min-h-6 text-center text-sm font-bold text-coral-ink">
        {state && !state.ok ? state.message : ""}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className="num aspect-[4/3] rounded-2xl bg-white text-2xl font-black shadow-sm active:scale-95">
            {d}
          </button>
        ))}
        <button type="button" aria-label="Delete" onClick={() => setPin((p) => p.slice(0, -1))} className="grid place-items-center rounded-2xl text-muted active:scale-95">
          <Delete />
        </button>
        <button type="button" onClick={() => press("0")} className="num aspect-[4/3] rounded-2xl bg-white text-2xl font-black shadow-sm active:scale-95">
          0
        </button>
        <button
          type="button"
          disabled={pin.length < 4 || pending}
          onClick={() => submit(pin)}
          className="rounded-2xl bg-brand text-lg font-black text-white disabled:opacity-40 active:scale-95"
        >
          {pending ? "…" : "OK"}
        </button>
      </div>
    </div>
  );
}
