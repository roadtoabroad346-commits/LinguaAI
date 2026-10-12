import { createHash } from "node:crypto";
import { z } from "zod";
import { getClientIp } from "@/lib/api/security";

/** Network context extracted server-side from request headers (never trusted from client). */
export interface NetworkContext {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  userAgent: string | null;
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    const d = decodeURIComponent(value).trim();
    return d.length > 0 ? d.slice(0, 80) : null;
  } catch {
    const t = value.trim();
    return t.length > 0 ? t.slice(0, 80) : null;
  }
}

/** Reads IP + Vercel geo headers. Locally (no Vercel headers) geo is null — expected. */
export function getNetworkContext(request: Request): NetworkContext {
  const h = (name: string) => request.headers.get(name);
  const ua = h("user-agent")?.slice(0, 300) ?? null;
  return {
    ip: getClientIp(request),
    country: decodeHeader(h("x-vercel-ip-country")),
    region: decodeHeader(h("x-vercel-ip-country-region")),
    city: decodeHeader(h("x-vercel-ip-city")),
    userAgent: ua,
  };
}

/** Device fingerprint as collected by the client beacon (no canvas/WebGL, no biometrics). */
const shortString = (max: number, fallback = "unknown") =>
  z
    .string()
    .trim()
    .transform((s) => s.slice(0, max))
    .optional()
    .default(fallback);

export const deviceFingerprintSchema = z.object({
  platform: shortString(80),
  screen: shortString(40),
  timezone: shortString(80),
  language: shortString(20),
  cores: z.coerce.number().int().min(0).max(512).optional().default(0),
  memoryGb: z.coerce.number().min(0).max(1024).optional().default(0),
  touch: z.coerce.boolean().optional().default(false),
  // First-touch marketing context (page path + referrer + UTM, all optional).
  landing: shortString(200, ""),
  referrer: shortString(500, ""),
  utmSource: shortString(100, ""),
  utmMedium: shortString(100, ""),
  utmCampaign: shortString(100, ""),
});
export type DeviceFingerprint = z.infer<typeof deviceFingerprintSchema>;

/**
 * Stable device id: sha256 over the hardware-ish fields only (marketing fields
 * excluded so the same phone keeps one id across campaigns).
 */
export function hashDevice(fp: Pick<DeviceFingerprint, "platform" | "screen" | "timezone" | "language" | "cores" | "memoryGb" | "touch">): string {
  const canonical = JSON.stringify({
    platform: fp.platform,
    screen: fp.screen,
    timezone: fp.timezone,
    language: fp.language,
    cores: fp.cores,
    memoryGb: fp.memoryGb,
    touch: fp.touch,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

/** Pure: true when the user logs in from a different known country. */
export function isCountryChange(lastCountry: string | null, current: string | null): boolean {
  return !!lastCountry && !!current && lastCountry !== current;
}

export type SecurityEventType =
  | "login" | "signup" | "device_new" | "country_change"
  | "shared_ip" | "password_reset" | "oauth_link";

interface SupabaseLike {
  // Structural minimal type: real Supabase clients satisfy this via `as never` at call sites.
  from(table: string): any;
}

/**
 * Best-effort event insert: never throws, so auth flows can call it freely.
 * Returns true when stored.
 */
export async function logSecurityEvent(
  supabase: SupabaseLike,
  event: {
    userId: string | null;
    type: SecurityEventType;
    net: NetworkContext;
    deviceId?: string | null;
    meta?: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase.from("security_events").insert({
      user_id: event.userId,
      event_type: event.type,
      ip: event.net.ip,
      country: event.net.country,
      region: event.net.region,
      city: event.net.city,
      user_agent: event.net.userAgent,
      device_id: event.deviceId ?? null,
      meta: event.meta ?? {},
    } as never);
    if (error) {
      console.error("[security] event insert failed", { message: error.message, type: event.type });
      return false;
    }
    return true;
  } catch (e) {
    console.error("[security] event insert threw", { type: event.type, message: (e as Error)?.message });
    return false;
  }
}
