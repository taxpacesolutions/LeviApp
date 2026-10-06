"use client";

import type { ReactNode } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import type { ActionResult } from "@/lib/types";

/** One-button form posting hidden fields to a Server Action. */
export function HiddenForm({
  action,
  fields,
  children,
  className,
  confirm,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  fields: Record<string, string>;
  children: ReactNode;
  className?: string;
  confirm?: string;
}) {
  return (
    <ActionForm action={action} showError={false} confirm={confirm}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button className={className}>{children}</button>
    </ActionForm>
  );
}
