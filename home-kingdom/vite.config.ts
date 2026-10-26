import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Supabase settings can come from a .env file or from the hosting provider.
// The names written by Vercel's Supabase integration are accepted too, so a
// one-click setup works without renaming anything.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";
  return {
    plugins: [react(), tailwindcss()],
    define: {
      __SUPABASE_URL__: JSON.stringify(url),
      // The anon/publishable key is designed to be public; Row Level Security
      // in the database is what protects the data.
      __SUPABASE_ANON_KEY__: JSON.stringify(key),
      __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16)),
    },
    build: { target: "es2020", chunkSizeWarningLimit: 600 },
  };
});
