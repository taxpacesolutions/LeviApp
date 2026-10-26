"use client";

import { useState } from "react";
import { saveMission } from "@/actions/parent";
import { ActionForm } from "@/components/ui/ActionForm";
import { EmojiPicker, Field, Input, Select, SubmitButton, Toggle } from "@/components/ui/fields";
import { EARN_CATEGORIES, MISSION_KINDS } from "@/lib/categories";
import type { Mission } from "@/lib/types";

export function MissionForm({ m }: { m?: Mission }) {
  const [kind, setKind] = useState<string>(m?.kind ?? "category_days");
  return (
    <ActionForm action={saveMission} className="space-y-4">
      {m && <input type="hidden" name="id" value={m.id} />}
      <Field label="Mission name" hint="Short and clear, e.g. “Read on 3 days”.">
        <Input name="title" defaultValue={m?.title} maxLength={60} required />
      </Field>
      <Field label="Icon">
        <EmojiPicker defaultValue={m?.icon ?? "🎯"} />
      </Field>
      <Field label="What does Levi have to do this week?">
        <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(MISSION_KINDS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      {kind === "category_days" && (
        <Field label="Category">
          <Select name="category" defaultValue={m?.category ?? "reading"}>
            {EARN_CATEGORIES.filter((c) => c.key !== "custom" && c.key !== "bonus").map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={kind === "category_days" ? "Number of days (1–7)" : "Number to reach"}>
        <Input name="target" type="number" inputMode="numeric" min={1} max={kind === "category_days" ? 7 : 1000} defaultValue={m?.target ?? 3} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bonus Bucks">
          <Input name="reward_bucks" type="number" inputMode="numeric" min={0} max={100} defaultValue={m?.reward_bucks ?? 2} required />
        </Field>
        <Field label="XP">
          <Input name="reward_xp" type="number" inputMode="numeric" min={0} max={500} defaultValue={m?.reward_xp ?? 10} required />
        </Field>
      </div>
      <Toggle name="active" label="Active" defaultChecked={m ? m.active : true} />
      <SubmitButton>{m ? "Save mission" : "Create mission"}</SubmitButton>
    </ActionForm>
  );
}
