import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { getCurrentUser } from "@/server/auth/session";
import { getSettings } from "@/server/settings";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "BupoHub", template: "%s · BupoHub" },
  description: "Tous les services Bupo réunis au même endroit.",
  applicationName: "BupoHub",
  icons: { icon: "/icon.svg" },
};

// Toutes les pages dépendent de la session et de la base : pas de pré-rendu au build.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#09090d",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, user, settings] = await Promise.all([getLocale(), getCurrentUser(), getSettings()]);
  const prefs = (user?.preferences ?? {}) as { accent?: string };
  const accent = prefs.accent ?? settings["site.accent"];

  return (
    <html lang={locale} data-accent={accent} className={`${inter.variable} ${mono.variable} dark h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: "!bg-surface !border-border-strong !text-fg !rounded-xl !shadow-2xl",
                description: "!text-fg-muted",
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
