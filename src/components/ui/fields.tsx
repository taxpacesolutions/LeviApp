"use client";

import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { EMOJI_CHOICES } from "@/lib/categories";
import { btn, inputCls } from "./styles";

export { btn, inputCls };

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-extrabold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs font-semibold text-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...props} className={`${inputCls} resize-none ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} appearance-none ${props.className ?? ""}`} />;
}

export function Toggle({ name, defaultChecked, label }: { name: string; defaultChecked?: boolean; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
      <span className="text-sm font-extrabold">{label}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative h-7 w-12 rounded-full bg-line transition peer-checked:bg-mint after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand" />
    </label>
  );
}

/** Preset chips (+1 +2 +5 +10) plus a custom number. */
export function AmountPicker({
  name = "amount",
  presets,
  defaultValue,
  sign = "+",
  max,
}: {
  name?: string;
  presets: number[];
  defaultValue?: number;
  sign?: "+" | "−" | "";
  max?: number;
}) {
  const [value, setValue] = useState<string>(defaultValue ? String(defaultValue) : "");
  return (
    <div>
      <div className="mb-2 grid grid-cols-4 gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setValue(String(p))}
            className={`num rounded-2xl py-3 text-lg font-black transition ${
              value === String(p) ? "bg-navy text-white" : "bg-canvas text-ink hover:bg-line"
            }`}
          >
            {sign}
            {p}
          </button>
        ))}
      </div>
      <Input
        name={name}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        step={1}
        required
        placeholder="Or type an amount"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

export function EmojiPicker({ name = "icon", defaultValue = "🎁" }: { name?: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-9 gap-1 rounded-2xl bg-canvas p-2">
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={`Icon ${e}`}
            onClick={() => setValue(e)}
            className={`aspect-square rounded-xl text-xl transition ${value === e ? "bg-white shadow ring-2 ring-brand" : "hover:bg-white"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <Input
        className="mt-2"
        aria-label="Or type any emoji"
        placeholder="Or type any emoji"
        value={value}
        maxLength={8}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

export function SubmitButton({ children, className = btn.primary + " w-full" }: { children: ReactNode; className?: string }) {
  return (
    <button type="submit" className={className}>
      {children}
    </button>
  );
}
