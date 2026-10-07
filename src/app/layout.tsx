import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", weight: ["500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "Levi Reward Bucks",
  description: "Earn, save, and spend Reward Bucks.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Reward Bucks", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b1b3f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
