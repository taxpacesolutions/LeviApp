"use client";

import { startTransition, useActionState, useRef, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSheet } from "./Sheet";
import { useToast } from "./Toast";
import type { ActionResult } from "@/lib/types";

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/**
 * Runs a Server Action, shows errors inline, toasts success, and closes the
 * surrounding sheet. Fields are NOT cleared on error.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  onSuccess,
  showError = true,
  resetOnSuccess = false,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  confirm?: string;
  onSuccess?: () => void;
  showError?: boolean;
  resetOnSuccess?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const sheet = useSheet();
  const toast = useToast();
  const router = useRouter();

  // Side effects run right after the action resolves (not in an effect), so they
  // still happen if this form unmounts because the page re-rendered.
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const result = await action(prev, fd);
    if (result?.ok) {
      toast(result.message, "success");
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.();
      sheet?.close();
    } else if (result?.locked) {
      router.push("/parent/unlock");
    } else if (result && !showError) {
      toast(result.message, "error");
    }
    return result;
  }, null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const fd = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.name) fd.set(submitter.name, submitter.value);
    startTransition(() => formAction(fd));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} aria-busy={pending}>
      <fieldset disabled={pending} className={`min-w-0 ${className ?? ""}`}>
        {children}
      </fieldset>
      {showError && state && !state.ok && !state.locked && (
        <p role="alert" className="mt-3 rounded-xl bg-coral-soft px-3 py-2 text-sm font-bold text-coral-ink">
          {state.message}
        </p>
      )}
    </form>
  );
}
