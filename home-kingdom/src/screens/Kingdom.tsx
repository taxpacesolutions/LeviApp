import { Icon, Sprite } from "../pixel/Sprite";
import { unlockPreview } from "../pixel/scene";
import { KingdomView } from "../components/KingdomView";
import { HeroAvatar, Panel } from "../components/ui";
import { useStore } from "../lib/store";
import { useActions } from "../lib/actions";
import { useT } from "../lib/i18n";
import { ACHIEVEMENTS, UNLOCKS } from "../lib/catalog";
import { go } from "../lib/router";

export function Kingdom() {
  const t = useT();
  const { data } = useStore();
  const actions = useActions();
  const got = new Map(data.unlocks.map((u) => [u.key, u]));
  const keys = Object.keys(UNLOCKS);
  const unlockedCount = keys.filter((k) => got.has(k)).length;

  return (
    <div className="flex flex-col gap-3">
      <header className="panel-wood flex items-center gap-2 px-3 py-2">
        <Icon name="castle" size={3} />
        <div className="flex-1">
          <h1 className="text-xl leading-none text-[#fff8e6]">{t("kingdom_title")}</h1>
          <p className="text-xs text-[#f6e3bd]">{t("kingdom_intro")}</p>
        </div>
        <span className="font-pixel rounded bg-[#fff8e6] px-2 text-ink">{unlockedCount}/{keys.length}</span>
      </header>

      <div className="panel overflow-hidden p-0"><KingdomView heroes /></div>

      <Panel title={t("decorations")} icon="star">
        <ul className="grid grid-cols-2 gap-2">
          {keys.map((k) => {
            const u = got.get(k);
            const def = UNLOCKS[k];
            const project = data.projects.find((p) => p.unlock_key === k);
            return (
              <li key={k} className={`flex flex-col gap-1 rounded border-2 p-2 ${u ? "border-ink/40 bg-paper" : "border-dashed border-ink/30 bg-parchment/60"}`}>
                <div className="flex h-12 items-center justify-center">
                  <Sprite grid={unlockPreview(k)} scale={2} className={`max-h-12 w-auto ${u ? "" : "opacity-35 grayscale"}`} />
                </div>
                <div className="text-sm leading-tight font-semibold">{def.title[t.lang]}</div>
                {u ? (
                  <button className="btn btn-sm mt-auto" onClick={() => actions.setUnlock(u.id, !u.enabled)}>
                    {u.enabled ? `👁 ${t("hide")}` : `◌ ${t("show")}`}
                  </button>
                ) : project ? (
                  <button className="mt-auto text-left text-xs text-water underline" onClick={() => go("quests", project.id)}>
                    🔒 {t("how_unlock", { title: project.title })}
                  </button>
                ) : def.source === "shop" ? (
                  <button className="mt-auto text-left text-xs text-water underline" onClick={() => go("shop")}>🔒 {t("from_shop")}</button>
                ) : (
                  <span className="mt-auto text-xs text-ink-soft">🔒 {t("locked")}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title={t("achievements")} icon="crown">
        <div className="flex flex-col gap-4">
          {data.profiles.map((p) => {
            const earned = new Set(data.achievements.filter((a) => a.profile_id === p.id).map((a) => a.key));
            return (
              <div key={p.id}>
                <div className="mb-2 flex items-center gap-2"><HeroAvatar profile={p} scale={2} /><span className="font-pixel text-lg">{p.display_name}</span></div>
                <ul className="grid grid-cols-4 gap-2">
                  {ACHIEVEMENTS.map((a) => {
                    const has = earned.has(a.key);
                    return (
                      <li key={a.key} className={`flex flex-col items-center rounded border-2 p-1 text-center ${has ? "border-ink bg-[#fff1c2]" : "border-ink/20 bg-parchment/50"}`}
                        title={a.desc[t.lang]}>
                        <span className={has ? "" : "opacity-30 grayscale"}><Icon name={has ? a.icon : "lock"} size={2} /></span>
                        <span className={`text-[11px] leading-tight ${has ? "font-semibold" : "text-ink-soft"}`}>{a.title[t.lang]}</span>
                        <span className="text-[10px] leading-tight text-ink-soft">{a.desc[t.lang]}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
