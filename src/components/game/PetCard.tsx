"use client";

import { useState } from "react";
import { renamePet } from "@/actions/kid";
import { ActionForm } from "@/components/ui/ActionForm";
import { SheetButton } from "@/components/ui/Sheet";
import { Field, Input, SubmitButton } from "@/components/ui/fields";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { play } from "@/lib/sound";
import type { GameState } from "@/lib/types";

const PET_LINES = ["Rawr! 🦖", "Yum, savings! 🪙", "You're the best! 💛", "Let's save more! 🐷", "High five! ✋"];

/** A dino that grows from what's saved. It never shrinks and never gets sad. */
export function PetCard({ game, canRename = true }: { game: GameState; canRename?: boolean }) {
  const { pet, pet_name: name, lifetime_saved: saved } = game;
  const [hearts, setHearts] = useState<number[]>([]);
  const [bounce, setBounce] = useState(0);
  const [line, setLine] = useState<string | null>(null);

  const happy = game.pet_happy;
  const toNext = pet.next_saved ? pet.next_saved - saved : 0;
  const pct = pet.next_saved ? Math.round(((saved - pet.min_saved) / (pet.next_saved - pet.min_saved)) * 100) : 100;

  function pat() {
    play("pop");
    const id = Date.now();
    setHearts((h) => [...h.slice(-4), id]);
    setBounce((b) => b + 1);
    setLine(PET_LINES[Math.floor(Math.random() * PET_LINES.length)]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1000);
  }

  return (
    <section className="card relative overflow-hidden bg-gradient-to-b from-mint-soft to-white" aria-label={`${name} the ${pet.name}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-mint-ink">Your savings pet</p>
          <p className="text-xl font-black">
            {name} <span className="text-base font-extrabold text-muted">the {pet.name}</span>
          </p>
        </div>
        {canRename && (
          <SheetButton title="Name your pet" label="✏️ Name" className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-muted shadow-sm">
            <ActionForm action={renamePet} className="space-y-4" sound="pop">
              <Field label="Pet name">
                <Input name="pet_name" defaultValue={name} maxLength={20} required />
              </Field>
              <SubmitButton>Save name</SubmitButton>
            </ActionForm>
          </SheetButton>
        )}
      </div>

      <div className="relative my-3 flex flex-col items-center">
        <button
          type="button"
          onClick={pat}
          aria-label={`Pat ${name}`}
          className="relative grid h-36 w-36 place-items-center rounded-full bg-white/70 shadow-inner outline-none focus-visible:ring-4 focus-visible:ring-brand"
        >
          <span key={bounce} className={`select-none text-[84px] leading-none ${bounce ? "pet-bounce" : "pet-idle"}`}>
            {pet.emoji}
          </span>
          {hearts.map((h) => (
            <span key={h} className="float-heart text-3xl">
              💛
            </span>
          ))}
        </button>
        <p className="mt-2 min-h-6 text-sm font-extrabold text-mint-ink" aria-live="polite">
          {line ?? (happy ? `${name} is happy! You saved this week. 😊` : `${name} is waiting for a savings snack 🦴`)}
        </p>
      </div>

      {pet.next_saved ? (
        <div>
          <ProgressBar value={pct} size="md" />
          <p className="num mt-1.5 text-xs font-bold text-muted">
            Save <span className="text-ink">{toNext} more Bucks</span> to grow into a {pet.next_name} {pet.next_emoji}
          </p>
        </div>
      ) : (
        <p className="text-center text-sm font-extrabold text-mint-ink">Fully grown! You&apos;re a super saver! 🏆</p>
      )}
    </section>
  );
}
