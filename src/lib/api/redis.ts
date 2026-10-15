/** Server-only Redis rate-limit backend (Upstash REST, optional).
 * No new dependencies: uses fetch to the Upstash REST API.
 * When env is missing or Redis fails, callers fail open to the in-memory
 * limiter in lib/api/security.ts (single-instance correctness preserved).
 */

import { readJson } from "@/lib/api/response";

const URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

export function isRedisConfigured(): boolean {
  return URL.startsWith("https://") && TOKEN.length >= 8;
}

async function redisCmd(path: string[], init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${URL.replace(/\/$/, "")}/${path.map(encodeURIComponent).join("/")}`, {
    ...init,
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const json = (await readJson(res).catch(() => null)) as { result?: unknown } | null;
  return json?.result ?? null;
}

/**
 * Fixed-window INCR + EXPIRE. Returns { allowed, retryAfter }.
 * Throws on any transport error so callers can fail open to memory.
 */
export async function redisFixedWindow(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfter: number }> {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  const full = `ratelimit:${key}`;
  // Pipeline: INCR then EXPIRE (EXPIRE is idempotent; window is approximate
  // under concurrency, which is fine for abuse protection).
  const res = await fetch(`${URL.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", full],
      ["EXPIRE", full, String(seconds), "NX"],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis pipeline ${res.status}`);
  const json = (await readJson(res).catch(() => null)) as Array<{ result?: unknown }> | null;
  const count = Number(json?.[0]?.result ?? 1);
  if (!Number.isFinite(count)) throw new Error("redis bad count");
  if (count <= limit) return { allowed: true, retryAfter: 0 };
  // TTL for Retry-After (best-effort).
  let retryAfter = seconds;
  try {
    const ttl = (await redisCmd(["TTL", full])) as number;
    if (Number.isFinite(ttl) && ttl > 0) retryAfter = Math.ceil(ttl);
  } catch {
    /* keep window default */
  }
  return { allowed: false, retryAfter };
}
