"use client";

import { useState } from "react";
import { requestSave } from "@/actions/kid";
import { ActionForm } from "@/components/ui/ActionForm";
import { SheetButton } from "@/components/ui/Sheet";
import { AmountPicker, btn, SubmitButton } from "@/components/ui/fields";

export function SaveRequestButton({
  canMove,
  parentTitle,
  goals,
}: {
  canMove: number;
  parentTitle: string;
  goals: { id: string; name: string; icon: string; left: number }[];
}) {
  const [goalId, setGoalId] = useState("");
  const presets = [1, 2, 5, 10].filter((n) => n <= Math.max(canMove, 1));
  return (
    <SheetButton
      title="Put Bucks in savings"
      className={btn.green + " w-full"}
      disabled={canMove <= 0}
      label={canMove > 0 ? "🐷 Put Bucks in savings" : "No Bucks to save right now"}
    >
      <ActionForm action={requestSave} className="space-y-5" sound="pop">
        <p className="font-semibold text-muted">
          You have <b className="text-ink">{canMove}</b> Bucks you can move. {parentTitle} will say yes or no.
        </p>
        <div>
          <p className="mb-2 text-sm font-extrabold">How many?</p>
          <AmountPicker presets={presets.length ? presets : [1]} max={canMove} sign="" />
        </div>
        {goals.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-extrabold">Save for…</p>
            <input type="hidden" name="goal_id" value={goalId} />
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setGoalId("")}
                className={`rounded-2xl px-4 py-3 text-left font-extrabold ${goalId === "" ? "bg-navy text-white" : "bg-canvas"}`}
              >
                🐷 Just savings
              </button>
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoalId(g.id)}
                  className={`rounded-2xl px-4 py-3 text-left font-extrabold ${goalId === g.id ? "bg-navy text-white" : "bg-canvas"}`}
                >
                  {g.icon} {g.name} <span className="text-sm opacity-70">· needs {g.left}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <SubmitButton className={btn.green + " w-full"}>Ask {parentTitle}</SubmitButton>
      </ActionForm>
    </SheetButton>
  );
}
