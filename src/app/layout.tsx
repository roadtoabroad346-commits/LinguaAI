import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { LOCALE_META } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import { AppProviders } from "@/components/providers/AppProviders";

const sans = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-sans", display: "swap" });
const display = Sora({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Learn English A1–C1 with AI`, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} — Learn English A1–C1 with AI`,
    description: APP_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: APP_NAME, description: APP_DESCRIPTION },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getRequestLocale();
  return (
    <html lang={LOCALE_META[locale].htmlLang} suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} min-h-dvh bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100`}>
        <AppProviders>
          <I18nProvider initialLocale={locale}>{children}</I18nProvider>
        </AppProviders>
      </body>
    </html>
  );
}
