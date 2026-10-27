import { supabase } from "./supabase";

// Push notifications: turning them on/off on this phone, and asking the
// server to tell the other hero about something important.

export type PushState = "unsupported" | "needs_install" | "denied" | "off" | "on";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

async function api(body: unknown) {
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`push_${res.status}`);
  return res.json();
}

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function pushState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return isIos() && !standalone() ? "needs_install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await (await fetch("/api/push")).json();
  if (!publicKey) throw new Error("push_not_ready");
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await api({ action: "subscribe", subscription: sub.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api({ action: "unsubscribe", endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }
  return "off";
}

// Fire-and-forget: the server checks the event really happened and decides
// whether (and whom) to notify. Never blocks or breaks the app.
export function notifyPartner(event: "reward_request" | "reward_decided" | "comment" | "quest_done", id: string | undefined) {
  if (!id || import.meta.env.DEV) return;
  api({ action: "notify", event, id }).catch(() => {});
}
