"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { createFirstAccount } from "@/actions/auth";
import { Field, Input } from "@/components/ui/fields";
import { btn } from "@/components/ui/styles";

export function FirstAccountForm() {
  const [state, action, pending] = useActionState(createFirstAccount, null);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }
  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <Field label="Your email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Repeat password">
        <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      {state && !state.ok && (
        <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-bold text-coral-ink">
          {state.message}
        </p>
      )}
      <button className={btn.green + " w-full"} disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
