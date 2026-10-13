import { NextResponse } from "next/server";
import { isRedisConfigured, redisFixedWindow } from "./redis";

/** Phase 9 — shared API hardening: consistent errors + rate limiting. */

export function apiError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function getClientIp(request: Request): string {
  const h = (name: string) => request.headers.get(name) ?? "";
  // x-vercel-forwarded-for is set by the Vercel edge and cannot be spoofed.
  // x-forwarded-for's first entry is client-controlled, so it is only a fallback.
  const vercel = h("x-vercel-forwarded-for").split(",")[0]?.trim();
  if (vercel) return vercel;
  const forwarded = h("x-forwarded-for").split(",")[0]?.trim();
  return forwarded || h("x-real-ip") || "local";
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const LIMIT_MESSAGES = {
  kk: "Әрекет тым көп. Біраз күтіп, қайта көріңіз.",
  ru: "Слишком много запросов. Подождите немного и попробуйте снова.",
  en: "Too many requests. Please slow down and try again shortly.",
} as const;

/** Interface language from the locale cookie (best-effort, defaults to English). */
function limitLocale(request: Request): keyof typeof LIMIT_MESSAGES {
  try {
    const cookie = request.headers.get("cookie") ?? "";
    const m = cookie.match(/(?:^|;\s*)linguaai_locale=(kk|ru|en)/);
    if (m) return m[1] as keyof typeof LIMIT_MESSAGES;
  } catch {
    /* fall through */
  }
  return "en";
}

function limitedResponse(request: Request, retryAfter: number) {
  const res = NextResponse.json(
    { error: LIMIT_MESSAGES[limitLocale(request)], code: "rate_limited" },
    { status: 429 }
  );
  res.headers.set("Retry-After", String(Math.max(1, retryAfter)));
  return res;
}

function memoryCheck(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Fixed-window rate limiter (per key). Returns null when allowed,
 * or a 429 JSON response when exceeded.
 * Redis (Upstash) when configured for multi-instance prod, otherwise
 * in-memory. Fails open to memory on Redis errors so a Redis outage
 * never blocks learning.
 */
export async function checkRateLimit(
  request: Request,
  opts: { key: string; limit?: number; windowMs?: number; scope?: string | null }
) {
  const limit = opts.limit ?? 20;
  const windowMs = opts.windowMs ?? 60_000;
  // Per-user scope when the caller is authenticated: account creation
  // (Supabase signup limits + email confirm) is the expensive step for
  // attackers, and a user id cannot be rotated like an IP header.
  const k = opts.scope ? `${opts.key}:u:${opts.scope}` : `${opts.key}:${getClientIp(request)}`;

  if (isRedisConfigured()) {
    try {
      const r = await redisFixedWindow(k, limit, windowMs);
      if (!r.allowed) return limitedResponse(request, r.retryAfter);
      return null;
    } catch {
      /* fail open to memory */
    }
  }

  const m = memoryCheck(k, limit, windowMs);
  if (!m.allowed) return limitedResponse(request, m.retryAfter);
  return null;
}

/** Test-only: reset in-memory buckets. */
export function __resetRateLimits() {
  buckets.clear();
}
