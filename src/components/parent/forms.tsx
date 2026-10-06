"use client";

import { useState } from "react";
import {
  addToGoal,
  deductBucks,
  earnBucks,
  moveBucks,
  purchaseGoal,
  saveGoal,
  saveReward,
  setBalances,
  takeFromGoal,
} from "@/actions/parent";
import { ActionForm } from "@/components/ui/ActionForm";
import { AmountPicker, btn, EmojiPicker, Field, Input, Select, SubmitButton, Textarea, Toggle } from "@/components/ui/fields";
import { DEDUCT_CATEGORIES, EARN_CATEGORIES } from "@/lib/categories";
import type { Goal, Reward } from "@/lib/types";

const ChildField = ({ childId }: { childId: string }) => <input type="hidden" name="child_id" value={childId} />;

export function EarnForm({ childId, childName, presets }: { childId: string; childName: string; presets: number[] }) {
  const [cat, setCat] = useState("");
  const chosen = EARN_CATEGORIES.find((c) => c.key === cat);
  return (
    <ActionForm action={earnBucks} className="space-y-5">
      <ChildField childId={childId} />
      <input type="hidden" name="category" value={cat} />
      <div>
        <p className="mb-2 text-sm font-extrabold">What did {childName} do?</p>
        <div className="grid grid-cols-2 gap-2">
          {EARN_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(c.key)}
              className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-extrabold transition ${
                cat === c.key ? "bg-navy text-white" : "bg-canvas hover:bg-line"
              }`}
            >
              <span className="text-lg">{c.emoji}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {chosen && (
        <>
          {(cat === "custom" || cat === "special" || cat === "bonus") && (
            <Field label="Description">
              <Input name="description" placeholder={cat === "custom" ? "e.g. Cleaned the car" : chosen.label} maxLength={80} required={cat === "custom"} />
            </Field>
          )}
          <div>
            <p className="mb-2 text-sm font-extrabold">How many Bucks?</p>
            <AmountPicker presets={presets} max={1000} />
          </div>
          <Field label="Note (optional)">
            <Textarea name="note" placeholder="Great job on…" maxLength={300} />
          </Field>
          <SubmitButton className={btn.green + " w-full"}>Add Bucks</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function DeductForm({ childId, available }: { childId: string; available: number }) {
  return (
    <ActionForm action={deductBucks} className="space-y-4">
      <ChildField childId={childId} />
      <p className="rounded-2xl bg-canvas p-3 text-sm font-bold text-muted">
        Available now: <span className="num text-ink">{available}</span> Bucks. Balances can&apos;t go below zero.
      </p>
      <Field label="Reason">
        <Select name="category" defaultValue="purchase">
          {DEDUCT_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.emoji} {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description">
        <Input name="description" placeholder="e.g. Ice cream at the park" maxLength={80} />
      </Field>
      <div>
        <p className="mb-2 text-sm font-extrabold">How many Bucks?</p>
        <AmountPicker presets={[1, 2, 5, 10]} sign="−" max={available || undefined} />
      </div>
      <Field label="Note (optional)">
        <Textarea name="note" maxLength={300} />
      </Field>
      <SubmitButton className={btn.dark + " w-full"}>Deduct Bucks</SubmitButton>
    </ActionForm>
  );
}

export function MoveForm({ childId, available, freeSavings }: { childId: string; available: number; freeSavings: number }) {
  const [dir, setDir] = useState<"to_savings" | "from_savings">("to_savings");
  return (
    <ActionForm action={moveBucks} className="space-y-4">
      <ChildField childId={childId} />
      <input type="hidden" name="direction" value={dir} />
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1">
        {(
          [
            ["to_savings", "Available → Savings"],
            ["from_savings", "Savings → Available"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setDir(k)}
            className={`rounded-xl py-2.5 text-sm font-extrabold ${dir === k ? "bg-white shadow" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-sm font-bold text-muted">
        {dir === "to_savings" ? (
          <>Available: <span className="num text-ink">{available}</span></>
        ) : (
          <>Free savings (not set aside for goals): <span className="num text-ink">{freeSavings}</span></>
        )}
      </p>
      <AmountPicker presets={[1, 5, 10, 20]} sign="" />
      <Field label="Note (optional)">
        <Input name="note" maxLength={300} />
      </Field>
      <SubmitButton>Move Bucks</SubmitButton>
    </ActionForm>
  );
}

export function SetBalancesForm({ childId, available, savings, allocated }: { childId: string; available: number; savings: number; allocated: number }) {
  return (
    <ActionForm action={setBalances} className="space-y-4" confirm="Post an adjustment to set these balances?">
      <ChildField childId={childId} />
      <p className="rounded-2xl bg-sun-soft p-3 text-sm font-bold text-sun-ink">
        This adds an <b>Adjustment</b> to the history so the balances match. Nothing is erased.
        {allocated > 0 && ` Savings can't go below ${allocated} (set aside for goals).`}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Available">
          <Input name="available" type="number" inputMode="numeric" min={0} defaultValue={available} required />
        </Field>
        <Field label="Savings">
          <Input name="savings" type="number" inputMode="numeric" min={0} defaultValue={savings} required />
        </Field>
      </div>
      <Field label="Reason">
        <Textarea name="reason" required placeholder="e.g. Fresh start for the new school year" maxLength={300} />
      </Field>
      <SubmitButton className={btn.dark + " w-full"}>Set balances</SubmitButton>
    </ActionForm>
  );
}

export function RewardForm({ reward }: { reward?: Reward }) {
  return (
    <ActionForm action={saveReward} className="space-y-4">
      {reward && <input type="hidden" name="id" value={reward.id} />}
      <Field label="Reward name">
        <Input name="name" required maxLength={60} defaultValue={reward?.name} placeholder="Movie Night" />
      </Field>
      <Field label="Description">
        <Textarea name="description" maxLength={200} defaultValue={reward?.description} placeholder="You pick the movie!" />
      </Field>
      <Field label="Cost in Bucks">
        <Input name="cost" type="number" inputMode="numeric" min={1} required defaultValue={reward?.cost} />
      </Field>
      <Field label="Icon">
        <EmojiPicker defaultValue={reward?.icon ?? "🎁"} />
      </Field>
      <Field label="Picture (optional)" hint="Shown instead of the icon. PNG/JPG/WEBP, up to 4 MB.">
        <Input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      </Field>
      {reward?.image_url && <Toggle name="remove_image" label="Remove current picture" />}
      <Toggle name="active" label="Show in the store" defaultChecked={reward ? reward.active : true} />
      <SubmitButton>{reward ? "Save reward" : "Create reward"}</SubmitButton>
    </ActionForm>
  );
}

export function GoalForm({ childId, goal }: { childId: string; goal?: Goal }) {
  return (
    <ActionForm action={saveGoal} className="space-y-4">
      <ChildField childId={childId} />
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <Field label="Goal name">
        <Input name="name" required maxLength={60} defaultValue={goal?.name} placeholder="LEGO Set" />
      </Field>
      <Field label="Goal amount (Bucks)">
        <Input name="target_amount" type="number" inputMode="numeric" min={1} required defaultValue={goal?.target_amount} />
      </Field>
      <Field label="Icon">
        <EmojiPicker defaultValue={goal?.icon ?? "🎯"} />
      </Field>
      <Field label="Picture (optional)">
        <Input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
      </Field>
      {goal?.image_url && <Toggle name="remove_image" label="Remove current picture" />}
      <Field label="Target date (optional)">
        <Input name="target_date" type="date" defaultValue={goal?.target_date ?? ""} />
      </Field>
      {goal && !goal.purchased_at && goal.status !== "completed" && (
        <Field label="Status">
          <Select name="status" defaultValue={goal.status}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </Select>
        </Field>
      )}
      <SubmitButton>{goal ? "Save goal" : "Create goal"}</SubmitButton>
    </ActionForm>
  );
}

export function GoalMoneyForm({ goal, available, freeSavings }: { goal: Goal; available: number; freeSavings: number }) {
  const [mode, setMode] = useState<"available" | "savings" | "take">("available");
  const left = goal.target_amount - goal.saved;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-canvas p-1 text-sm">
        {(
          [
            ["available", "From available"],
            ["savings", "From savings"],
            ["take", "Take out"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-xl py-2.5 font-extrabold ${mode === k ? "bg-white shadow" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="text-sm font-bold text-muted">
        {mode === "available" && <>Moves Bucks from Available into Savings for this goal. Available: {available}. Goal needs {left}.</>}
        {mode === "savings" && <>Sets aside Bucks already in Savings. Free savings: {freeSavings}. Goal needs {left}.</>}
        {mode === "take" && <>Moves Bucks out of this goal back to free savings. In goal: {goal.saved}.</>}
      </p>
      <ActionForm key={mode} action={mode === "take" ? takeFromGoal : addToGoal} className="space-y-4">
        <input type="hidden" name="goal_id" value={goal.id} />
        {mode !== "take" && <input type="hidden" name="source" value={mode} />}
        <AmountPicker presets={[1, 5, 10, 20]} sign="" />
        <SubmitButton>{mode === "take" ? "Take out" : "Add to goal"}</SubmitButton>
      </ActionForm>
    </div>
  );
}

export function PurchaseGoalForm({ goal }: { goal: Goal }) {
  return (
    <ActionForm action={purchaseGoal} confirm={`Spend ${goal.saved} Bucks from savings on ${goal.name}?`}>
      <input type="hidden" name="goal_id" value={goal.id} />
      <button className={btn.green + " px-4 py-2.5 text-sm"}>🛍️ Mark as bought</button>
    </ActionForm>
  );
}
