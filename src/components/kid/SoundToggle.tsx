"use client";

import { useSyncExternalStore } from "react";
import { play, setSoundEnabled, soundEnabled } from "@/lib/sound";

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn));

export function SoundToggle() {
  const on = useSyncExternalStore(subscribe, soundEnabled, () => true);
  return (
    <button
      type="button"
      aria-label={on ? "Turn sounds off" : "Turn sounds on"}
      aria-pressed={on}
      onClick={() => {
        setSoundEnabled(!on);
        listeners.forEach((l) => l());
        if (!on) play("pop");
      }}
      className="grid h-9 w-9 place-items-center rounded-full bg-white text-base shadow-sm"
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}
