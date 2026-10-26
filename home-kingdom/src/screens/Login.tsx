import { useState, type FormEvent } from "react";
import { Sprite } from "../pixel/Sprite";
import { kingdomScene } from "../pixel/scene";
import { heroSprite } from "../pixel/hero";
import { supabase } from "../lib/supabase";
import { translate, type TKey } from "../lib/i18n";
import type { Lang } from "../lib/types";

const SCENE = kingdomScene({ unlocks: ["garden", "tree"] });

function useLang() {
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem("hk-lang") as Lang) || "es"; } catch { return "es"; }
  });
  const t = (k: TKey) => translate(lang, k);
  const toggle = () => {
    const next = lang === "es" ? "en" : "es";
    setLang(next);
    try { localStorage.setItem("hk-lang", next); } catch { /* ignore */ }
  };
  return { t, lang, toggle };
}

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-4 safe-top safe-bottom">
      <div className="panel overflow-hidden p-0">
        <div className="relative">
          <Sprite grid={SCENE} scale={1} className="block h-auto w-full" />
          <div className="absolute bottom-[4%] left-[35%] w-[11%]"><Sprite grid={heroSprite("jessica")} scale={1} className="bob h-auto w-full" /></div>
          <div className="absolute bottom-[4%] left-[55%] w-[11%]"><Sprite grid={heroSprite("mariano")} scale={1} className="bob bob-delay h-auto w-full" /></div>
        </div>
        <div className="panel-wood rounded-none border-x-0 border-b-0 px-3 py-2 text-center">
          <h1 className="text-2xl text-[#fff8e6]">Home Kingdom</h1>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Login() {
  const { t, lang, toggle } = useLang();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const redirect = window.location.origin;
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMsg({ text: /confirm/i.test(error.message) ? t("check_email") : t("bad_login"), bad: true });
    } else if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirect } });
      if (error) setMsg({ text: error.message, bad: true });
      else if (!data.session) setMsg({ text: t("check_email") });
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect });
      setMsg(error ? { text: error.message, bad: true } : { text: t("reset_sent") });
    }
    setBusy(false);
  }

  return (
    <AuthFrame>
      <form onSubmit={submit} className="panel p-4">
        <div className="mb-3 flex items-center">
          <h2 className="flex-1 text-xl">{mode === "forgot" ? t("forgot") : mode === "signup" ? t("sign_up") : t("login_title")}</h2>
          <button type="button" className="chip" onClick={toggle}>{lang === "es" ? "English" : "Español"}</button>
        </div>
        <p className="mb-3 text-sm text-ink-soft">{t("tagline")}</p>
        <label className="label" htmlFor="email">{t("email")}</label>
        <input id="email" className="field mb-3" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== "forgot" && (
          <>
            <label className="label" htmlFor="password">{t("password")}</label>
            <input id="password" className="field" type="password" required minLength={mode === "signup" ? 8 : 1}
              autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "signup" && <p className="mt-1 text-xs text-ink-soft">{t("password_hint")}</p>}
          </>
        )}
        {msg && <p className={`mt-3 rounded p-2 text-sm ${msg.bad ? "bg-[#fde3dc]" : "bg-[#e6f5d9]"}`} role="status">{msg.text}</p>}
        <button className="btn btn-gold mt-4 w-full text-lg" disabled={busy}>
          {mode === "forgot" ? t("send_reset") : mode === "signup" ? t("sign_up") : t("sign_in")}
        </button>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
          {mode !== "signin" && <button type="button" className="underline" onClick={() => { setMode("signin"); setMsg(null); }}>{t("have_account")}</button>}
          {mode === "signin" && <button type="button" className="underline" onClick={() => { setMode("signup"); setMsg(null); }}>{t("no_account")}</button>}
          {mode === "signin" && <button type="button" className="underline" onClick={() => { setMode("forgot"); setMsg(null); }}>{t("forgot")}</button>}
        </div>
      </form>
    </AuthFrame>
  );
}

export function SetPassword({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  return (
    <AuthFrame>
      <form className="panel p-4" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setErr(error.message); else onDone();
      }}>
        <h2 className="mb-3 text-xl">{t("new_password")}</h2>
        <input className="field" type="password" minLength={8} required autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)} aria-label={t("new_password")} />
        <p className="mt-1 text-xs text-ink-soft">{t("password_hint")}</p>
        {err && <p className="mt-2 rounded bg-[#fde3dc] p-2 text-sm">{err}</p>}
        <button className="btn btn-gold mt-4 w-full">{t("set_password")}</button>
      </form>
    </AuthFrame>
  );
}

export function NotMember({ email }: { email: string }) {
  const { t } = useLang();
  return (
    <AuthFrame>
      <div className="panel p-4">
        <h2 className="mb-2 text-xl">{t("not_member_title")}</h2>
        <p className="mb-2">{t("not_member_body")}</p>
        <p className="mb-4 rounded bg-parchment p-2 font-mono text-sm break-all">{email}</p>
        <button className="btn w-full" onClick={() => supabase.auth.signOut()}>{t("sign_out")}</button>
      </div>
    </AuthFrame>
  );
}

export function SetupNeeded() {
  const { t } = useLang();
  return (
    <AuthFrame>
      <div className="panel p-4">
        <h2 className="mb-2 text-xl">{t("setup_title")}</h2>
        <p>{t("setup_body")}</p>
      </div>
    </AuthFrame>
  );
}

export function Splash({ text, onRetry }: { text?: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <Sprite grid={heroSprite("jessica")} scale={4} className="bob" />
      <p className="font-pixel text-lg">{text ?? "Home Kingdom"}</p>
      {onRetry && <button className="btn btn-gold" onClick={onRetry}>↻</button>}
    </div>
  );
}
