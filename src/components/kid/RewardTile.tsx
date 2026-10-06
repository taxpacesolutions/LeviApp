"use client";

import { requestReward } from "@/actions/kid";
import { ActionForm } from "@/components/ui/ActionForm";
import { SheetButton } from "@/components/ui/Sheet";
import { btn, SubmitButton } from "@/components/ui/fields";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { percent } from "@/lib/format";
import type { Reward } from "@/lib/types";

export function RewardArt({ reward, size = 64 }: { reward: Pick<Reward, "icon" | "image_url">; size?: number }) {
  return reward.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={reward.image_url} alt="" className="rounded-2xl object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid place-items-center rounded-2xl bg-canvas" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {reward.icon}
    </span>
  );
}

export function RewardTile({ reward, spendable, parentTitle }: { reward: Reward; spendable: number; parentTitle: string }) {
  const canBuy = spendable >= reward.cost;
  const need = reward.cost - spendable;
  return (
    <li className="card flex flex-col items-center p-4 text-center">
      <RewardArt reward={reward} />
      <p className="mt-3 font-extrabold leading-tight">{reward.name}</p>
      <p className="num mt-1 rounded-full bg-sun-soft px-3 py-0.5 text-sm font-black text-sun-ink">{reward.cost} Bucks</p>
      <div className="mt-auto w-full pt-3">
        {canBuy ? (
          <SheetButton title={reward.name} label="Redeem Reward" className={btn.primary + " w-full px-2 py-2.5 text-sm"}>
            <div className="flex flex-col items-center text-center">
              <RewardArt reward={reward} size={96} />
              {reward.description && <p className="mt-3 font-semibold text-muted">{reward.description}</p>}
              <div className="mt-4 grid w-full grid-cols-3 gap-2 rounded-2xl bg-canvas p-3 text-sm font-bold">
                <div>
                  <p className="num text-xl font-black">{spendable}</p>
                  <p className="text-muted">You have</p>
                </div>
                <div>
                  <p className="num text-xl font-black text-coral-ink">−{reward.cost}</p>
                  <p className="text-muted">Costs</p>
                </div>
                <div>
                  <p className="num text-xl font-black text-mint-ink">{spendable - reward.cost}</p>
                  <p className="text-muted">Left</p>
                </div>
              </div>
              <ActionForm action={requestReward} className="mt-5 w-full">
                <input type="hidden" name="reward_id" value={reward.id} />
                <SubmitButton>Ask {parentTitle} 🙋</SubmitButton>
              </ActionForm>
              <p className="mt-2 text-xs font-bold text-muted">Bucks come out when {parentTitle} says yes.</p>
            </div>
          </SheetButton>
        ) : (
          <div>
            <ProgressBar value={percent(spendable, reward.cost)} size="sm" tone="sun" />
            <p className="mt-1.5 text-xs font-bold text-muted">{need} more Bucks to go</p>
          </div>
        )}
      </div>
    </li>
  );
}
