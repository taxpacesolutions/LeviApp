"use client";

import { cancelMyRequest } from "@/actions/kid";
import { ActionForm } from "@/components/ui/ActionForm";

export function CancelRequestButton({ id, kind }: { id: string; kind: "redemption" | "transfer" }) {
  return (
    <ActionForm action={cancelMyRequest} showError={false} confirm="Cancel this request?">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <button className="rounded-xl bg-canvas px-2.5 py-1.5 text-xs font-extrabold text-muted hover:text-ink">Cancel</button>
    </ActionForm>
  );
}
