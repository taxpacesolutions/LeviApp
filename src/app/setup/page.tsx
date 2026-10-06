import Link from "next/link";
import { missingEnv } from "@/lib/env";
import { signOut } from "@/actions/auth";

export const metadata = { title: "Setup · Levi Reward Bucks" };

export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  const { reason } = await searchParams;
  const missing = missingEnv();

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <div className="card space-y-4">
        <h1 className="text-2xl font-black">Almost ready 🛠️</h1>
        {missing.length > 0 ? (
          <>
            <p className="font-semibold text-muted">These environment variables are missing. Add them to <code>.env.local</code> (or your host) and restart:</p>
            <ul className="list-disc space-y-1 pl-6 font-mono text-sm">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <p className="text-sm font-semibold text-muted">See README.md → “Connect Supabase”.</p>
          </>
        ) : reason === "no-child" ? (
          <p className="font-semibold text-muted">
            Your family has no children yet. Run <code>supabase/seed.sql</code>, or in the Supabase SQL editor run{" "}
            <code>select create_child(&apos;&lt;family id&gt;&apos;, &apos;Levi&apos;, &apos;🦖&apos;);</code>
          </p>
        ) : (
          <>
            <p className="font-semibold text-muted">
              This account isn&apos;t linked to a family yet. Make sure you ran <code>supabase/seed.sql</code> (it creates the
              family and an unclaimed parent profile), and that your email is in <code>ALLOWED_EMAILS</code> if you set it.
            </p>
            <form action={signOut}>
              <button className="rounded-2xl bg-navy px-5 py-3 font-extrabold text-white">Sign out</button>
            </form>
          </>
        )}
        <Link href="/kid" className="inline-block font-extrabold text-brand">
          Try again →
        </Link>
      </div>
    </main>
  );
}
