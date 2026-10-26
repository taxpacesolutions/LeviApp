import { useState } from "react";
import { Icon, Sprite } from "../pixel/Sprite";
import { unlockPreview } from "../pixel/scene";
import { RewardForm } from "../components/forms";
import { Empty, Gold, HeroAvatar, Panel, Sheet } from "../components/ui";
import { useStore } from "../lib/store";
import { useActions } from "../lib/actions";
import { fmtDate, useT, type TKey } from "../lib/i18n";
import { go } from "../lib/router";
import type { Redemption, ShopItem } from "../lib/types";

type Tab = "virtual" | "real" | "requests";

export function Shop({ param }: { param: string | null }) {
  const t = useT();
  const { data, me, partner } = useStore();
  const tab: Tab = param === "real" || param === "requests" ? param : "virtual";
  const [buying, setBuying] = useState<ShopItem | null>(null);
  const [editing, setEditing] = useState<ShopItem | "new" | null>(null);
  const owned = new Set(data.unlocks.map((u) => u.key));
  const toApprove = data.redemptions.filter((r) => r.status === "requested" && r.requested_by !== me?.id).length;

  const items = data.items.filter((i) => i.category === tab);
  const visible = items.filter((i) => i.active);
  const hidden = items.filter((i) => !i.active);

  return (
    <div className="flex flex-col gap-3">
      <header className="panel-wood px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon name="bag" size={3} />
          <h1 className="flex-1 text-xl text-[#fff8e6]">{t("shop_title")}</h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-1 rounded bg-[#fff8e6] px-2 py-0.5 text-ink"><HeroAvatar profile={me} scale={1} /> <Gold n={me?.gold ?? 0} /></span>
          <span className="flex items-center gap-1 rounded bg-[#fff8e6] px-2 py-0.5 text-ink"><Icon name="chest" size={1} /> <Gold n={data.household?.treasury_gold ?? 0} /></span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2" role="tablist">
        {(["virtual", "real", "requests"] as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} aria-pressed={tab === k} className="chip relative justify-center"
            onClick={() => go("shop", k === "virtual" ? undefined : k)}>
            {t(k === "virtual" ? "shop_virtual" : k === "real" ? "shop_real" : "shop_requests")}
            {k === "requests" && toApprove > 0 && <span className="ml-1 rounded-full bg-berry px-1.5 text-xs text-white">{toApprove}</span>}
          </button>
        ))}
      </div>

      {tab === "real" && <p className="panel-parchment p-3 text-sm">💛 {t("consent_note")}</p>}

      {tab !== "requests" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {visible.map((item) => (
              <ItemCard key={item.id} item={item} owned={item.unlock_key ? owned.has(item.unlock_key) : false}
                onBuy={() => setBuying(item)} onEdit={() => setEditing(item)} />
            ))}
          </div>
          {tab === "real" && <button className="btn btn-green" onClick={() => setEditing("new")}>＋ {t("reward_new")}</button>}
          {hidden.length > 0 && (
            <details className="panel-parchment p-3">
              <summary className="font-semibold">{t("hidden")} ({hidden.length})</summary>
              <div className="mt-2 flex flex-col gap-1">
                {hidden.map((i) => <button key={i.id} className="text-left underline" onClick={() => setEditing(i)}>{i.title}</button>)}
              </div>
            </details>
          )}
          <p className="text-center text-xs text-ink-soft">{t("gold_note")}</p>
        </>
      )}

      {tab === "requests" && <Requests />}

      <Sheet open={buying !== null} title={buying?.title ?? ""} onClose={() => setBuying(null)}>
        {buying && <BuySheet item={buying} partnerName={partner?.display_name ?? ""} onDone={() => setBuying(null)} />}
      </Sheet>
      <Sheet open={editing !== null} title={editing === "new" ? t("reward_new") : t("reward_edit")} onClose={() => setEditing(null)}>
        {editing && <RewardForm key={editing === "new" ? "new" : editing.id} item={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </div>
  );
}

function ItemCard({ item, owned, onBuy, onEdit }: { item: ShopItem; owned: boolean; onBuy: () => void; onEdit: () => void }) {
  const t = useT();
  return (
    <div className="panel flex flex-col p-2">
      <div className="flex h-16 items-center justify-center rounded bg-[#e9f4fb]">
        {item.category === "virtual" && item.unlock_key
          ? <Sprite grid={unlockPreview(item.unlock_key)} scale={2} className="max-h-14 w-auto" />
          : <Icon name={item.icon} size={4} />}
      </div>
      <h3 className="mt-1 text-sm leading-tight">{item.title}</h3>
      {item.description && <p className="text-xs text-ink-soft">{item.description}</p>}
      {item.category === "real" && item.requires_approval && <p className="mt-0.5 text-xs text-ink-soft">✋ {t("needs_ok")}</p>}
      <div className="mt-auto flex items-center gap-1 pt-2">
        <Gold n={item.price} />
        <button className="btn btn-sm btn-ghost ml-auto px-1" onClick={onEdit} aria-label={t("edit")}>✎</button>
        {owned
          ? <span className="badge bg-[#bfe3a8]">✓ {t("owned")}</span>
          : <button className="btn btn-sm btn-gold" onClick={onBuy}>{item.category === "real" && item.requires_approval ? t("request") : t("buy")}</button>}
      </div>
    </div>
  );
}

function BuySheet({ item, partnerName, onDone }: { item: ShopItem; partnerName: string; onDone: () => void }) {
  const t = useT();
  const { data, me, toast } = useStore();
  const actions = useActions();
  const [busy, setBusy] = useState(false);
  const treasury = data.household?.treasury_gold ?? 0;
  const mine = me?.gold ?? 0;
  const needsOk = item.category === "real" && item.requires_approval;

  async function pay(from: "self" | "treasury") {
    setBusy(true);
    const status = await actions.buy(item.id, from);
    setBusy(false);
    if (!status) return;
    if (status === "requested") toast(t("requested", { name: partnerName }), "good", "gift");
    else if (status === "completed") toast(t("bought"), "good", "castle");
    else toast(t("redeemed"), "good", "gift");
    onDone();
  }

  // Requests that wait for approval can be sent even before the gold is there;
  // the gold is only checked (and taken) when the other person says yes.
  const canSelf = needsOk || mine >= item.price;
  const canTreasury = item.category === "real" || treasury >= item.price;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {item.category === "virtual" && item.unlock_key ? <Sprite grid={unlockPreview(item.unlock_key)} scale={3} /> : <Icon name={item.icon} size={4} />}
        <div><Gold n={item.price} className="text-xl" />{item.description && <p className="text-sm">{item.description}</p>}</div>
      </div>
      {needsOk && <p className="rounded bg-parchment p-2 text-sm">✋ {t("needs_ok")} ({partnerName})</p>}
      {item.category === "real" && <p className="text-xs text-ink-soft">{t("treasury_needs_ok")}</p>}
      <span className="label">{t("pay_from")}</span>
      <button className="btn btn-gold" disabled={busy || !canSelf} onClick={() => pay("self")}>
        <HeroAvatar profile={me} scale={1} /> {t("pay_self", { n: mine })}
      </button>
      <button className="btn" disabled={busy || !canTreasury} onClick={() => pay("treasury")}>
        <Icon name="chest" size={2} /> {t("pay_treasury", { n: treasury })}
      </button>
      {!canSelf && !canTreasury && <p className="text-center text-sm text-berry">{t("not_enough")}</p>}
    </div>
  );
}

function Requests() {
  const t = useT();
  const { data, me } = useStore();
  const actions = useActions();
  const real = data.redemptions.filter((r) => r.category === "real");
  const toApprove = real.filter((r) => r.status === "requested" && r.requested_by !== me?.id);
  const mine = real.filter((r) => r.status === "requested" && r.requested_by === me?.id);
  const toEnjoy = real.filter((r) => r.status === "approved");
  const history = data.redemptions.filter((r) => ["completed", "declined", "cancelled"].includes(r.status)).slice(0, 25);

  const Row = ({ r, children }: { r: Redemption; children?: React.ReactNode }) => {
    const who = data.profiles.find((p) => p.id === r.requested_by);
    const item = data.items.find((i) => i.id === r.item_id);
    return (
      <li className="flex flex-col gap-2 rounded border-2 border-ink/25 bg-paper p-2">
        <div className="flex items-center gap-2">
          <HeroAvatar profile={who} scale={2} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-snug">{r.title}</div>
            <div className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">
              {who?.display_name} · <Gold n={r.price} size={1} /> {r.pay_from === "treasury" && `· ${t("from_treasury")}`} · {fmtDate(t.lang, r.created_at)}
            </div>
          </div>
          {item?.category === "virtual" && item.unlock_key && <Sprite grid={unlockPreview(item.unlock_key)} scale={1} />}
          <span className="badge bg-parchment">{t(`r_${r.status}` as TKey)}</span>
        </div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Panel title={t("to_approve")} icon="help">
        {toApprove.length === 0 ? <Empty>{t("no_requests")}</Empty> : (
          <ul className="flex flex-col gap-2">{toApprove.map((r) => (
            <Row key={r.id} r={r}>
              <button className="btn btn-sm btn-green flex-1" onClick={() => actions.decide(r.id, true)}>✓ {t("approve")}</button>
              <button className="btn btn-sm flex-1" onClick={() => actions.decide(r.id, false)}>{t("decline")}</button>
            </Row>
          ))}</ul>
        )}
      </Panel>
      <Panel title={t("to_enjoy")} icon="gift">
        {toEnjoy.length === 0 ? <Empty>{t("no_requests")}</Empty> : (
          <ul className="flex flex-col gap-2">{toEnjoy.map((r) => (
            <Row key={r.id} r={r}><button className="btn btn-sm btn-gold" onClick={() => actions.completeRedemption(r.id)}>★ {t("mark_done")}</button></Row>
          ))}</ul>
        )}
      </Panel>
      <Panel title={t("my_requests")} icon="scroll">
        {mine.length === 0 ? <Empty>{t("no_requests")}</Empty> : (
          <ul className="flex flex-col gap-2">{mine.map((r) => (
            <Row key={r.id} r={r}><button className="btn btn-sm" onClick={() => actions.cancelRedemption(r.id)}>{t("cancel_request")}</button></Row>
          ))}</ul>
        )}
      </Panel>
      {history.length > 0 && (
        <Panel title={t("history")} icon="clock" tone="parchment">
          <ul className="flex flex-col gap-2">{history.map((r) => <Row key={r.id} r={r} />)}</ul>
        </Panel>
      )}
    </div>
  );
}
