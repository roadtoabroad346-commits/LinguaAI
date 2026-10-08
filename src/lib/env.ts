import { z } from "zod";
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().optional().default("gemini-3.5-flash-lite"),
  NEXT_PUBLIC_APP_URL: z.string().optional().default("http://localhost:3000"),
  // Vercel ставит это автоматически — используем как запасной вариант в проде.
  VERCEL_URL: z.string().optional().default(""),
});
export type Env = z.infer<typeof envSchema>;

/** Убирает пробелы и конечный слэш, добавляет https:// если схемы нет. */
export function normalizeSiteUrl(raw: string | undefined | null): string {
  const fallback = "http://localhost:3000";
  let value = (raw ?? "").trim();
  if (!value) return fallback;
  // VERCEL_URL приходит без схемы (xxx.vercel.app) — добавляем https.
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  // Убираем конечные слэши: https://site.vercel.app/ -> https://site.vercel.app
  value = value.replace(/\/+$/, "");
  try {
    const parsed = new URL(value);
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return fallback;
  }
}

/** Единый источник правды для базового URL сайта. */
export function getSiteUrl(requestOrigin?: string): string {
  const fromEnv = normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL);
  // Если в проде забыли выставить NEXT_PUBLIC_APP_URL (или там localhost),
  // а Vercel дал свой домен — берем его.
  const vercel = process.env.VERCEL_URL ? normalizeSiteUrl(process.env.VERCEL_URL) : "";
  const isLocalDefault = fromEnv.includes("localhost");
  const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (isProd && isLocalDefault && vercel) return vercel;
  if (isProd && isLocalDefault && requestOrigin) return normalizeSiteUrl(requestOrigin);
  return fromEnv;
}
export function isSupabaseConfigured(): boolean {
  return isSupabaseUrlValid(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * The URL must be a real http(s) URL with a dotted host.
 * Catches the classic misconfiguration where a JWT/key gets pasted
 * into the URL field (presence checks alone would pass, then every
 * Supabase call would throw at runtime).
 */
export function isSupabaseUrlValid(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const value = raw.trim();
  if (!value) return false;
  // A JWT (always starts with base64('{"') = "eyJ") or bare key is never a valid project URL.
  if (/^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return false;
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (!isLocal && !host.includes(".")) return false;
    if (url.protocol !== "https:" && !isLocal) return false;
    // Bare "localhost" (no scheme, no port) is never a usable project URL.
    if (isLocal && !/^https?:\/\//i.test(value) && !url.port) return false;
    return true;
  } catch {
    return false;
  }
}
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
