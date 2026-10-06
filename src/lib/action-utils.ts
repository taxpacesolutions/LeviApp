import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { familyActionContext, parentActionContext, ParentLockedError, type FamilyContext } from "@/lib/context";
import { startParentSession } from "@/lib/parent-session";
import type { ActionResult } from "@/lib/types";

export class UserError extends Error {}

function friendly(e: unknown): string {
  if (e instanceof UserError || e instanceof ParentLockedError) return e.message;
  const msg = e instanceof Error ? e.message : "";
  // Messages raised by our SQL functions are written for people; constraint errors are not.
  if (!msg || /violates|syntax|column|relation|function|permission|JWT|fetch failed/i.test(msg)) {
    console.error("[action]", e);
    return "Something went wrong. Please try again.";
  }
  return msg;
}

async function run(fn: () => Promise<string>): Promise<ActionResult> {
  try {
    const message = await fn();
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (e) {
    return { ok: false, message: friendly(e), locked: e instanceof ParentLockedError };
  }
}

/** Wrap a Parent Mode action: requires a valid PIN session and extends it. */
export function parentAction(fn: (ctx: FamilyContext) => Promise<string>) {
  return run(async () => {
    const ctx = await parentActionContext();
    const msg = await fn(ctx);
    await startParentSession(ctx.user.id, ctx.familyId, ctx.settings.parent_session_minutes);
    return msg;
  });
}

/** Wrap a kid-safe action (signed-in family, no PIN needed). */
export function familyAction(fn: (ctx: FamilyContext) => Promise<string>) {
  return run(async () => fn(await familyActionContext()));
}

export async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

type OwnedTable =
  | "transactions"
  | "rewards"
  | "goals"
  | "redemption_requests"
  | "transfer_requests"
  | "achievements"
  | "profiles";

/** Every id that comes from the browser must belong to the signed-in family. */
export async function assertOwned(table: OwnedTable, id: string, familyId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserError("Not found.");
  const { data } = await db().from(table).select("id").eq("id", id).eq("family_id", familyId).maybeSingle();
  if (!data) throw new UserError("Not found.");
}

export function assertChild(ctx: FamilyContext, childId: string | null | undefined) {
  const c = ctx.children.find((k) => k.id === childId);
  if (!c) throw new UserError("Child not found.");
  return c;
}

// ---- form helpers --------------------------------------------------------
export function str(fd: FormData, key: string, max = 200): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function requiredStr(fd: FormData, key: string, label: string, max = 200): string {
  const v = str(fd, key, max);
  if (!v) throw new UserError(`Please enter ${label}.`);
  return v;
}

export function int(fd: FormData, key: string, label: string, { min = 1, max = 100000 } = {}): number {
  const raw = str(fd, key);
  const n = Number(raw);
  if (!raw || !Number.isInteger(n)) throw new UserError(`${label} must be a whole number.`);
  if (n < min) throw new UserError(`${label} must be at least ${min}.`);
  if (n > max) throw new UserError(`${label} must be ${max} or less.`);
  return n;
}

export function bool(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

// ---- images --------------------------------------------------------------
const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Uploads an optional picture to Supabase Storage and returns its public URL. */
export async function uploadImage(fd: FormData, key: string, familyId: string): Promise<string | null> {
  const file = fd.get(key);
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new UserError("Pictures must be PNG, JPG, WEBP or GIF.");
  if (file.size > 4 * 1024 * 1024) throw new UserError("Pictures must be smaller than 4 MB.");
  const path = `${familyId}/${randomUUID()}.${ext}`;
  const bucket = db().storage.from("reward-images");
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new UserError(`Picture upload failed: ${error.message}`);
  return bucket.getPublicUrl(path).data.publicUrl;
}
