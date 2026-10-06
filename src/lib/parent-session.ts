import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export const PARENT_COOKIE = "lrb_parent";

function sign(payload: string) {
  return createHmac("sha256", env.parentSessionSecret()).update(payload).digest("base64url");
}

function payloadFor(userId: string, familyId: string, exp: number) {
  return `${userId}:${familyId}:${exp}`;
}

/** Issue (or extend) the signed, httpOnly Parent Mode cookie. Server Actions only. */
export async function startParentSession(userId: string, familyId: string, minutes: number) {
  const exp = Math.floor(Date.now() / 1000) + minutes * 60;
  const value = `${exp}.${sign(payloadFor(userId, familyId, exp))}`;
  const store = await cookies();
  store.set(PARENT_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: minutes * 60,
  });
}

export async function endParentSession() {
  const store = await cookies();
  store.delete(PARENT_COOKIE);
}

export async function hasParentSession(userId: string, familyId: string): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(PARENT_COOKIE)?.value;
  if (!raw) return false;
  const [expStr, sig] = raw.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(payloadFor(userId, familyId, exp)));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
