import type { ReactNode } from "react";
import { Icon } from "../pixel/Sprite";
import { go, type Screen } from "../lib/router";
import { useT, type TKey } from "../lib/i18n";
import { useStore } from "../lib/store";
import { AddFlow, type AddMode } from "./forms";
import { CelebrationOverlay, Sheet, Toasts } from "./ui";

const NAV: { screen: Screen; icon: string; label: TKey }[] = [
  { screen: "home", icon: "house", label: "nav_home" },
  { screen: "quests", icon: "scroll", label: "nav_quests" },
  { screen: "shop", icon: "bag", label: "nav_shop" },
  { screen: "campfire", icon: "fire", label: "nav_campfire" },
  { screen: "kingdom", icon: "castle", label: "nav_kingdom" },
];

export function Shell({ screen, children, add, setAdd }: {
  screen: Screen; children: ReactNode; add: { mode: AddMode; title?: string }; setAdd: (m: AddMode, title?: string) => void;
}) {
  const t = useT();
  const { offline, data } = useStore();
  const pending = data.redemptions.filter((r) => r.status === "requested").length;
  const addTitle = add.mode === "menu" ? t("add_what") : add.mode === "project" ? t("project_new") : add.mode === "coop" ? t("coop_new")
    : add.mode === "task" ? t("task_new") : t("add_message");
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <Toasts />
      <CelebrationOverlay />
      {offline && <div className="bg-ink px-3 py-1 text-center text-sm text-cream safe-top">{t("offline")}</div>}
      <main className="flex-1 px-3 pt-3 pb-28 safe-top">{children}</main>

      {screen !== "campfire" && (
        <button className="btn btn-gold fixed right-4 z-30 h-14 w-14 rounded-full! p-0 text-3xl"
          style={{ bottom: "calc(84px + env(safe-area-inset-bottom))" }} aria-label={t("add_button")} onClick={() => setAdd("menu")}>
          +
        </button>
      )}

      <nav className="panel-wood fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg rounded-b-none border-b-0 safe-bottom" aria-label="Home Kingdom">
        <ul className="grid grid-cols-5">
          {NAV.map((n) => {
            const active = n.screen === screen;
            return (
              <li key={n.screen}>
                <button onClick={() => go(n.screen)} aria-current={active ? "page" : undefined}
                  className={`tap relative flex w-full flex-col items-center gap-0.5 pt-2 pb-1.5 ${active ? "bg-[#6b4223]/60" : ""}`}>
                  <Icon name={n.icon} size={3} />
                  <span className={`font-pixel text-xs ${active ? "text-gold" : "text-[#fff3d4]"}`}>{t(n.label)}</span>
                  {n.screen === "shop" && pending > 0 && (
                    <span className="absolute top-1 right-[22%] min-w-5 rounded-full border-2 border-ink bg-berry px-1 text-center text-xs font-bold text-white">{pending}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <Sheet open={add.mode !== null} title={addTitle} onClose={() => setAdd(null)}>
        <AddFlow mode={add.mode} initialTitle={add.title} setMode={setAdd} />
      </Sheet>
    </div>
  );
}
