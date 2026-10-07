import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { LOCALE_META } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4f46e5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getRequestLocale();
  return (
    <html lang={LOCALE_META[locale].htmlLang}>
      <body className="min-h-screen">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
