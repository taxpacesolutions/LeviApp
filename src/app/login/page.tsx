import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · Levi Reward Bucks" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-navy text-4xl shadow-lg">💰</div>
        <h1 className="mt-5 text-3xl font-black">Reward Bucks</h1>
        <p className="mt-1 font-bold text-muted">Family sign-in</p>
      </div>
      <LoginForm />
      <p className="mt-6 text-center text-xs font-semibold text-muted">
        This is a private family app. Parent tools are protected by a PIN after you sign in.
      </p>
    </main>
  );
}
