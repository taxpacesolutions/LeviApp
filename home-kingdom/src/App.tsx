import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { configured, supabase } from "./lib/supabase";
import { StoreProvider, useStore } from "./lib/store";
import { LangContext, hasKey, translate } from "./lib/i18n";
import { ACHIEVEMENTS, UNLOCKS } from "./lib/catalog";
import { useRoute } from "./lib/router";
import type { Achievement, Lang, Profile } from "./lib/types";
import { Shell } from "./components/Shell";
import { Sheet } from "./components/ui";
import type { AddMode } from "./components/forms";
import { Login, NotMember, SetPassword, SetupNeeded, Splash } from "./screens/Login";
import { Home } from "./screens/Home";
import { Quests } from "./screens/Quests";
import { Shop } from "./screens/Shop";
import { Campfire } from "./screens/Campfire";
import { Kingdom } from "./screens/Kingdom";
import { SettingsPanel } from "./screens/Settings";

function clearLocalData() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith("hk-cache-") || k.startsWith("hk-who-")) localStorage.removeItem(k);
  } catch { /* storage blocked */ }
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") clearLocalData();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured) return <SetupNeeded />;
  if (session === undefined) return <Splash />;
  if (!session) return <Login />;
  if (recovery) return <SetPassword onDone={() => setRecovery(false)} />;
  return <Member key={session.user.id} session={session} />;
}

type Who = { profile_id: string; hero: string; household_id: string } | null;

// Checks that this login is one of the two heroes, then opens the kingdom.
function Member({ session }: { session: Session }) {
  const cacheKey = `hk-who-${session.user.id}`;
  const [who, setWho] = useState<Who | undefined>(() => {
    try { const raw = localStorage.getItem(cacheKey); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
  });
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const langRef = useRef<Lang>("es");

  useEffect(() => {
    supabase.rpc("hk_whoami").then(({ data, error }) => {
      // Network trouble: keep the remembered hero (offline viewing) or offer a retry.
      if (error) { setFailed(true); return; }
      setFailed(false);
      setWho(data as Who);
      try { if (data) localStorage.setItem(cacheKey, JSON.stringify(data)); else localStorage.removeItem(cacheKey); } catch { /* ignore */ }
    });
  }, [cacheKey, attempt]);

  const errorText = useCallback((e: unknown) => {
    const msg = String((e as { message?: string })?.message ?? "");
    const key = `err_${msg.trim()}`;
    if (hasKey(key)) return translate(langRef.current, key);
    if (/fetch|network|offline/i.test(msg)) return translate(langRef.current, "err_offline");
    return translate(langRef.current, "error");
  }, []);
  const onLevelUp = useCallback((p: Profile, level: number) => translate(langRef.current, "level_up", { name: p.display_name, level }), []);
  const onAchievement = useCallback((a: Achievement, who?: Profile) => {
    const def = ACHIEVEMENTS.find((x) => x.key === a.key);
    return `${who?.display_name ?? ""} · ${translate(langRef.current, "new_achievement", { title: def?.title[langRef.current] ?? a.key })}`;
  }, []);
  const onUnlock = useCallback((key: string) => translate(langRef.current, "unlocked_toast", { title: UNLOCKS[key]?.title[langRef.current] ?? key }), []);

  if (who === undefined && failed) return <Splash text={translate("es", "err_offline")} onRetry={() => { setFailed(false); setAttempt((n) => n + 1); }} />;
  if (who === undefined) return <Splash />;
  if (who === null) return <NotMember email={session.user.email ?? ""} />;
  return (
    <StoreProvider profileId={who.profile_id} errorText={errorText} onLevelUp={onLevelUp} onAchievement={onAchievement} onUnlock={onUnlock}>
      <Main langRef={langRef} />
    </StoreProvider>
  );
}

function Main({ langRef }: { langRef: React.MutableRefObject<Lang> }) {
  const { me, ready, data } = useStore();
  const route = useRoute();
  const [add, setAddState] = useState<{ mode: AddMode; title?: string }>({ mode: null });
  const [settings, setSettings] = useState(false);
  const setAdd = useCallback((mode: AddMode, title?: string) => setAddState({ mode, title }), []);
  const lang: Lang = me?.lang ?? "es";
  langRef.current = lang;
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  if (!ready) return <Splash text={translate(lang, "loading")} />;
  if (!data.household) return <Splash text={translate(lang, "offline")} />;

  return (
    <LangContext.Provider value={lang}>
      <Shell screen={route.screen} add={add} setAdd={setAdd}>
        {route.screen === "home" && <Home setAdd={setAdd} openSettings={() => setSettings(true)} />}
        {route.screen === "quests" && <Quests param={route.param} setAdd={setAdd} />}
        {route.screen === "shop" && <Shop param={route.param} />}
        {route.screen === "campfire" && <Campfire />}
        {route.screen === "kingdom" && <Kingdom />}
      </Shell>
      <Sheet open={settings} title={translate(lang, "settings")} onClose={() => setSettings(false)}>
        <SettingsPanel onClose={() => setSettings(false)} />
      </Sheet>
    </LangContext.Provider>
  );
}
