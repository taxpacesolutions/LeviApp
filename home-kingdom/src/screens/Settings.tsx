import { useState } from "react";
import { Sprite } from "../pixel/Sprite";
import { ACCESSORIES, DEFAULT_AVATARS, HAIR_COLORS, HAIR_STYLES, HATS, OUTFITS, SKINS, STYLES, heroSprite } from "../pixel/hero";
import { Field, Panel, Segmented } from "../components/ui";
import { useStore } from "../lib/store";
import { useActions } from "../lib/actions";
import { useT, type TKey } from "../lib/i18n";
import { DEFAULT_SETTINGS } from "../lib/game";
import { exportCsv, exportJson } from "../lib/export";
import { supabase } from "../lib/supabase";
import type { Avatar, Lang, Settings as Economy } from "../lib/types";

const LABELS: Record<string, Record<Lang, string>> = {
  short: { es: "Corto", en: "Short" }, long: { es: "Largo", en: "Long" }, bun: { es: "Moño", en: "Bun" },
  ponytail: { es: "Coleta", en: "Ponytail" }, curly: { es: "Rizado", en: "Curly" }, spiky: { es: "De punta", en: "Spiky" },
  none: { es: "Nada", en: "None" }, bandana: { es: "Pañuelo", en: "Bandana" }, cap: { es: "Gorra", en: "Cap" },
  hardhat: { es: "Casco", en: "Hard hat" }, flowers: { es: "Flores", en: "Flowers" },
  clipboard: { es: "Tablilla", en: "Clipboard" }, hammer: { es: "Martillo", en: "Hammer" }, wrench: { es: "Llave", en: "Wrench" },
  book: { es: "Libro", en: "Book" }, flower: { es: "Flor", en: "Flower" },
  tunic: { es: "Túnica", en: "Tunic" }, dress: { es: "Vestido", en: "Dress" },
};

function Swatches({ label, value, colors, onChange }: { label: string; value: string; colors: Record<string, string>; onChange: (v: string) => void }) {
  return (
    <div className="mb-3">
      <span className="label">{label}</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {Object.entries(colors).map(([k, c]) => (
          <button key={k} type="button" role="radio" aria-checked={value === k} aria-label={k} onClick={() => onChange(k)}
            className={`h-9 w-9 rounded border-3 ${value === k ? "border-ink ring-2 ring-water" : "border-ink/30"}`} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { data, me } = useStore();
  const actions = useActions();
  const L = (k: string) => LABELS[k]?.[t.lang] ?? k;

  const [name, setName] = useState(me?.display_name ?? "");
  const [role, setRole] = useState(me?.role_title ?? "");
  const [avatar, setAvatar] = useState<Avatar & { style?: string }>(() => ({ ...(me ? DEFAULT_AVATARS[me.hero] : {}), ...(me?.avatar ?? {}) }));
  const set = (k: string) => (v: string) => setAvatar((a) => ({ ...a, [k]: v }));

  const [kingdomName, setKingdomName] = useState(data.household?.name ?? "");
  const [econ, setEcon] = useState<Economy>({ ...DEFAULT_SETTINGS, ...(data.household?.settings ?? {}) });

  if (!me) return null;

  const econRows: [TKey, keyof Economy, keyof Economy][] = [
    ["task_small", "small_gold", "small_xp"], ["task_medium", "medium_gold", "medium_xp"], ["task_large", "large_gold", "large_xp"],
    ["project_reward", "project_gold", "project_xp"], ["coop_reward", "coop_gold", "coop_xp"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Panel title={t("my_hero")} icon="star">
        <div className="mb-3 flex justify-center rounded bg-[#cfe8c0] py-3">
          <Sprite grid={heroSprite(me.hero, avatar)} scale={5} className="bob" />
        </div>
        <Field label={t("name")}>{(id) => <input id={id} className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label={t("role")}>{(id) => <input id={id} className="field" value={role} maxLength={40} onChange={(e) => setRole(e.target.value)} />}</Field>
        <Segmented label={t("outfit")} value={avatar.style ?? "tunic"} onChange={set("style")} options={STYLES.map((s) => ({ value: s, label: L(s) }))} />
        <Swatches label={t("outfit")} value={avatar.outfit ?? ""} colors={OUTFITS} onChange={set("outfit")} />
        <Segmented label={t("hair")} value={avatar.hair ?? "short"} onChange={set("hair")} options={HAIR_STYLES.map((s) => ({ value: s, label: L(s) }))} />
        <Swatches label={t("hair_color")} value={avatar.hairColor ?? ""} colors={HAIR_COLORS} onChange={set("hairColor")} />
        <Swatches label={t("skin")} value={avatar.skin ?? ""} colors={SKINS} onChange={set("skin")} />
        <Segmented label={t("hat")} value={avatar.hat ?? "none"} onChange={set("hat")} options={HATS.map((s) => ({ value: s, label: L(s) }))} />
        <Segmented label={t("accessory")} value={avatar.accessory ?? "none"} onChange={set("accessory")} options={ACCESSORIES.map((s) => ({ value: s, label: L(s) }))} />
        <button className="btn btn-green w-full" disabled={!name.trim()} onClick={async () => {
          await actions.updateProfile(me.id, { display_name: name.trim(), role_title: role.trim(), avatar });
          onClose();
        }}>{t("save")}</button>
      </Panel>

      <Panel title={t("language")} icon="chat">
        <Segmented label=" " value={me.lang} onChange={(v) => actions.updateProfile(me.id, { lang: v })}
          options={[{ value: "es" as Lang, label: "Español" }, { value: "en" as Lang, label: "English" }]} />
      </Panel>

      {data.household && (
        <Panel title={t("economy")} icon="coin">
          <Field label={t("kingdom_name")}>{(id) => <input id={id} className="field" value={kingdomName} maxLength={60} onChange={(e) => setKingdomName(e.target.value)} />}</Field>
          <p className="mb-2 text-sm text-ink-soft">{t("economy_hint")}</p>
          <table className="mb-3 w-full text-sm">
            <thead><tr><th /><th className="font-semibold">🪙</th><th className="font-semibold">XP</th></tr></thead>
            <tbody>
              {econRows.map(([label, g, x]) => (
                <tr key={label}>
                  <td className="py-1 pr-2">{t(label)}</td>
                  {[g, x].map((k) => (
                    <td key={k} className="py-1 pr-1">
                      <input className="field min-h-9! px-2! py-1!" type="number" inputMode="numeric" min={0} max={1000} aria-label={`${t(label)} ${k}`}
                        value={econ[k]} onChange={(e) => setEcon((s) => ({ ...s, [k]: Math.max(0, Math.min(1000, +e.target.value || 0)) }))} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-green w-full" disabled={!kingdomName.trim()}
            onClick={() => actions.updateHousehold(data.household!.id, { name: kingdomName.trim(), settings: econ })}>{t("save")}</button>
        </Panel>
      )}

      <Panel title={t("backup")} icon="chest">
        <p className="mb-2 text-sm">{t("backup_hint")}</p>
        <div className="flex flex-col gap-2">
          <button className="btn" onClick={() => exportJson(data)}>⬇ {t("download_json")}</button>
          <button className="btn" onClick={() => exportCsv(data)}>⬇ {t("download_csv")}</button>
        </div>
      </Panel>

      <Panel tone="parchment">
        <p className="mb-2 text-sm">📱 {t("install_hint")}</p>
        <p className="mb-3 text-xs text-ink-soft">{t("gold_note")} · {t("version")} {__APP_VERSION__}</p>
        <button className="btn btn-red w-full" onClick={() => supabase.auth.signOut()}>{t("sign_out")}</button>
      </Panel>
    </div>
  );
}
