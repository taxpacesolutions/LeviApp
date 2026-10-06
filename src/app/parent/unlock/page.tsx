import Link from "next/link";
import { redirect } from "next/navigation";
import { getFamilyContext } from "@/lib/context";
import { hasParentSession } from "@/lib/parent-session";
import { PinPad } from "./PinPad";

export const metadata = { title: "Parent Mode · Reward Bucks" };

export default async function UnlockPage() {
  const ctx = await getFamilyContext();
  if (await hasParentSession(ctx.user.id, ctx.familyId)) redirect("/parent");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-navy text-3xl text-white shadow-lg">🔒</div>
        <h1 className="mt-4 text-2xl font-black">Parent Mode</h1>
        <p className="mt-1 font-bold text-muted">Enter your PIN</p>
      </div>
      <PinPad />
      <Link href="/kid" className="mt-6 text-center font-extrabold text-brand">
        ← Back to {ctx.child.display_name}&apos;s view
      </Link>
    </main>
  );
}
