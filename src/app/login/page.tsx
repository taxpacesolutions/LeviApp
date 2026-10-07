import { cookies } from "next/headers";
import { needsFirstAccount } from "@/actions/auth";
import { LoginForm } from "./LoginForm";
import { FirstAccountForm } from "./FirstAccountForm";

export const metadata = { title: "Sign in · Levi Reward Bucks" };

export default async function LoginPage() {
  await cookies(); // render per request: the first-run check reads the database
  const firstRun = await needsFirstAccount().catch(() => false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-navy text-4xl shadow-lg">💰</div>
        <h1 className="mt-5 text-3xl font-black">Reward Bucks</h1>
        <p className="mt-1 font-bold text-muted">{firstRun ? "Welcome! Create the family login" : "Family sign-in"}</p>
      </div>
      {firstRun ? <FirstAccountForm /> : <LoginForm />}
      <p className="mt-6 text-center text-xs font-semibold text-muted">
        {firstRun
          ? "This is the login you'll use on every device. Parent tools also need a PIN (starts as 1234)."
          : "This is a private family app. Parent tools are protected by a PIN after you sign in."}
      </p>
    </main>
  );
}
