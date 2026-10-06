"use client";

import { useState } from "react";
import { changePin, inviteParent, runBonusCheck, saveAchievement, saveBonusRule, saveChild, saveSettings } from "@/actions/parent";
import { ActionForm } from "@/components/ui/ActionForm";
import { btn, EmojiPicker, Field, Input, Select, SubmitButton, Textarea, Toggle } from "@/components/ui/fields";
import { EARN_CATEGORIES, RULE_LABELS, STREAKABLE } from "@/lib/categories";
import type { Achievement, SavingsBonusRule, Settings } from "@/lib/types";

export function GeneralSettingsForm({ settings, familyName }: { settings: Settings; familyName: string }) {
  return (
    <ActionForm action={saveSettings} className="space-y-4">
      <Field label="Family name">
        <Input name="family_name" defaultValue={familyName} maxLength={60} />
      </Field>
      <Field label="What do the kids call you?" hint={`Used in messages like “Ask ${settings.parent_title}”.`}>
        <Input name="parent_title" defaultValue={settings.parent_title} maxLength={20} required />
      </Field>
      <Field label="Timezone" hint="Used for streaks, weeks and dates. Example: America/Chicago">
        <Input name="timezone" defaultValue={settings.timezone} required />
      </Field>
      <Field label="Lock Parent Mode after (minutes of inactivity)">
        <Input name="parent_session_minutes" type="number" min={1} max={720} defaultValue={settings.parent_session_minutes} required />
      </Field>
      <Field label="Quick amounts for “Add Bucks”" hint="Up to 6 numbers, separated by commas.">
        <Input name="earn_presets" defaultValue={settings.earn_presets.join(", ")} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-extrabold">Track streaks for</legend>
        <div className="grid grid-cols-2 gap-2">
          {STREAKABLE.map((c) => (
            <label key={c.key} className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm font-bold">
              <input type="checkbox" name="streak_categories" value={c.key} defaultChecked={settings.streak_categories.includes(c.key)} className="h-4 w-4 accent-[#1f6feb]" />
              {c.emoji} {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton>Save settings</SubmitButton>
    </ActionForm>
  );
}

export function PinForm() {
  return (
    <ActionForm action={changePin} className="space-y-4" resetOnSuccess>
      <Field label="Current PIN">
        <Input name="current" type="password" inputMode="numeric" autoComplete="off" pattern="\d{4,8}" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="New PIN">
          <Input name="new" type="password" inputMode="numeric" autoComplete="new-password" pattern="\d{4,8}" required />
        </Field>
        <Field label="Repeat new PIN">
          <Input name="confirm" type="password" inputMode="numeric" autoComplete="new-password" pattern="\d{4,8}" required />
        </Field>
      </div>
      <SubmitButton className={btn.dark + " w-full"}>Change PIN</SubmitButton>
    </ActionForm>
  );
}

export function BonusRuleForm({ rule }: { rule: SavingsBonusRule | null }) {
  const [type, setType] = useState<"percent" | "flat">(rule?.bonus_type ?? "percent");
  return (
    <div className="space-y-3">
      <ActionForm action={saveBonusRule} className="space-y-4">
        {rule && <input type="hidden" name="id" value={rule.id} />}
        <Toggle name="enabled" label="Savings Bonus is on" defaultChecked={rule?.enabled} />
        <Field label="Bonus type">
          <Select name="bonus_type" value={type} onChange={(e) => setType(e.target.value as "percent" | "flat")}>
            <option value="percent">Percent of savings (like interest)</option>
            <option value="flat">Flat amount</option>
          </Select>
        </Field>
        {type === "percent" ? (
          <Field label="Percent" hint="Rounded to the nearest whole Buck.">
            <Input name="percent" type="number" step="0.5" min={0.5} max={100} defaultValue={rule?.percent ?? 5} required />
          </Field>
        ) : (
          <Field label="Bonus Bucks">
            <Input name="flat_amount" type="number" min={1} defaultValue={rule?.flat_amount ?? 5} required />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum savings" hint="Must stay at or above this the whole time.">
            <Input name="min_balance" type="number" min={0} defaultValue={rule?.min_balance ?? 0} required />
          </Field>
          <Field label="How often">
            <Select name="frequency" defaultValue={rule?.frequency ?? "monthly"}>
              <option value="monthly">Every month</option>
              <option value="weekly">Every week</option>
            </Select>
          </Field>
        </div>
        <SubmitButton>Save Savings Bonus</SubmitButton>
      </ActionForm>
      <ActionForm action={runBonusCheck}>
        <button className={btn.soft + " w-full"}>Check for due bonuses now</button>
      </ActionForm>
    </div>
  );
}

export function ChildForm({ child }: { child?: { id: string; display_name: string; avatar_emoji: string } }) {
  return (
    <ActionForm action={saveChild} className="space-y-4">
      {child && <input type="hidden" name="id" value={child.id} />}
      <Field label="Name">
        <Input name="display_name" defaultValue={child?.display_name} maxLength={40} required />
      </Field>
      <Field label="Avatar">
        <EmojiPicker name="avatar_emoji" defaultValue={child?.avatar_emoji ?? "🦖"} />
      </Field>
      <SubmitButton>{child ? "Save" : "Add child"}</SubmitButton>
    </ActionForm>
  );
}

export function InviteParentForm() {
  return (
    <ActionForm action={inviteParent} className="space-y-4">
      <Field label="Name">
        <Input name="display_name" placeholder="Dad" maxLength={40} required />
      </Field>
      <Field label="Email" hint="Also create this user in Supabase → Authentication → Users.">
        <Input name="email" type="email" required />
      </Field>
      <SubmitButton>Add parent</SubmitButton>
    </ActionForm>
  );
}



export function AchievementForm({ a }: { a?: Achievement }) {
  const [rule, setRule] = useState(a?.rule_type ?? "lifetime_earned");
  return (
    <ActionForm action={saveAchievement} className="space-y-4">
      {a && <input type="hidden" name="id" value={a.id} />}
      <Field label="Badge name">
        <Input name="name" defaultValue={a?.name} maxLength={60} required />
      </Field>
      <Field label="Description">
        <Textarea name="description" defaultValue={a?.description} maxLength={200} />
      </Field>
      <Field label="Icon">
        <EmojiPicker defaultValue={a?.icon ?? "⭐"} />
      </Field>
      <Field label="How is it earned?">
        <Select name="rule_type" value={rule} onChange={(e) => setRule(e.target.value as Achievement["rule_type"])}>
          {Object.entries(RULE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      {rule !== "manual" && (
        <Field label="Number to reach">
          <Input name="threshold" type="number" min={1} defaultValue={a?.threshold ?? 10} required />
        </Field>
      )}
      {(rule === "category_count" || rule === "streak_days") && (
        <Field label={rule === "streak_days" ? "Category (optional — any streak if blank)" : "Category"}>
          <Select name="category" defaultValue={a?.category ?? ""}>
            {rule === "streak_days" && <option value="">Any category</option>}
            {EARN_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Toggle name="active" label="Active" defaultChecked={a ? a.active : true} />
      <SubmitButton>{a ? "Save badge" : "Create badge"}</SubmitButton>
    </ActionForm>
  );
}

