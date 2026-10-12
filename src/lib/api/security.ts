import { NextResponse } from "next/server";

/** Phase 9 — shared API hardening: consistent errors + lightweight in-memory rate limiting. */

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

/**
 * Fixed-window rate limiter (per key). Returns null when allowed,
 * or a 429 JSON response when exceeded. In-memory: sufficient for
 * single-instance; use Redis/Upstash for multi-instance prod.
 */
export function checkRateLimit(
  request: Request,
  opts: { key: string; limit?: number; windowMs?: number; scope?: string | null }
) {
  const limit = opts.limit ?? 20;
  const windowMs = opts.windowMs ?? 60_000;
  const now = Date.now();
  // Per-user scope when the caller is authenticated: account creation
  // (Supabase signup limits + email confirm) is the expensive step for
  // attackers, and a user id cannot be rotated like an IP header.
  const k = opts.scope ? `${opts.key}:u:${opts.scope}` : `${opts.key}:${getClientIp(request)}`;
  const b = buckets.get(k);
  if (!b || b.resetAt <= now) {
    buckets.set(k, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (b.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    const res = NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429 }
    );
    res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  b.count += 1;
  return null;
}

/** Test-only: reset in-memory buckets. */
export function __resetRateLimits() {
  buckets.clear();
}
