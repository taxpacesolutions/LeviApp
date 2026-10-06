"use client";

import { Pencil, Undo2 } from "lucide-react";
import { correctTransaction, reverseTransaction } from "@/actions/parent";
import { ActionForm } from "@/components/ui/ActionForm";
import { SheetButton } from "@/components/ui/Sheet";
import { btn, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/fields";
import type { CategoryInfo } from "@/lib/categories";
import { DEDUCT_CATEGORIES } from "@/lib/categories";

export function TxnRowActions({
  txn,
  earnCategories,
}: {
  txn: { id: string; description: string; category: string | null; amount: number; editable: boolean; isEarn: boolean };
  earnCategories: CategoryInfo[];
}) {
  const cats = txn.isEarn ? earnCategories : DEDUCT_CATEGORIES;
  return (
    <div className="mt-2 flex gap-2 pl-14">
      {txn.editable && (
        <SheetButton
          title="Fix this entry"
          className="inline-flex items-center gap-1 rounded-xl bg-canvas px-3 py-1.5 text-xs font-extrabold text-muted hover:text-ink"
          label={
            <>
              <Pencil size={12} /> Edit
            </>
          }
        >
          <p className="mb-4 rounded-2xl bg-sun-soft p-3 text-sm font-bold text-sun-ink">
            The original stays in the history. We add a reversal and a corrected entry.
          </p>
          <ActionForm action={correctTransaction} className="space-y-4">
            <input type="hidden" name="id" value={txn.id} />
            <Field label="Correct amount">
              <Input name="amount" type="number" inputMode="numeric" min={1} required defaultValue={txn.amount} />
            </Field>
            <Field label="Category">
              <Select name="category" defaultValue={txn.category ?? ""}>
                {cats.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Description">
              <Input name="description" defaultValue={txn.description} maxLength={80} />
            </Field>
            <Field label="Why the change?">
              <Textarea name="reason" placeholder="e.g. Typed 50 instead of 5" />
            </Field>
            <SubmitButton>Save correction</SubmitButton>
          </ActionForm>
        </SheetButton>
      )}
      <SheetButton
        title="Reverse this entry?"
        className="inline-flex items-center gap-1 rounded-xl bg-canvas px-3 py-1.5 text-xs font-extrabold text-muted hover:text-coral-ink"
        label={
          <>
            <Undo2 size={12} /> Reverse
          </>
        }
      >
        <p className="mb-4 text-sm font-semibold text-muted">
          “{txn.description}” will be cancelled out by a new <b>reversal</b> entry. Nothing is deleted.
        </p>
        <ActionForm action={reverseTransaction} className="space-y-4">
          <input type="hidden" name="id" value={txn.id} />
          <Field label="Reason (optional)">
            <Textarea name="reason" placeholder="e.g. Added by mistake" />
          </Field>
          <SubmitButton className={btn.danger + " w-full py-3.5 text-base"}>Reverse it</SubmitButton>
        </ActionForm>
      </SheetButton>
    </div>
  );
}
