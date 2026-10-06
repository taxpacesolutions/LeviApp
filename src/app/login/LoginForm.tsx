"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { signIn } from "@/actions/auth";
import { btn, Field, Input } from "@/components/ui/fields";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);

  // Submit manually so a wrong password doesn't clear the email field.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state && !state.ok && (
        <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-bold text-coral-ink">
          {state.message}
        </p>
      )}
      <button className={btn.primary + " w-full"} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
