import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api/security";
import {
  deviceFingerprintSchema,
  getNetworkContext,
  hashDevice,
  isMissingTableError,
  logSecurityEvent,
} from "@/lib/security/telemetry";

export const dynamic = "force-dynamic";

/**
 * POST /api/security/device — registers the caller's device fingerprint.
 * Server is source of truth: device id = sha256 of hardware-ish fields,
 * network context (IP/geo) is read from headers, never trusted from client.
 * Logs `device_new` only for genuinely new devices (low volume by design).
 */
export async function POST(request: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  // Scoped by user id (rotation-proof); runs after auth so the scope is known.
  const limited = await checkRateLimit(request, { key: "security-device", limit: 20, windowMs: 60_000, scope: user.id });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = deviceFingerprintSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fingerprint.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const fp = parsed.data;
  const deviceId = hashDevice(fp);
  const net = getNetworkContext(request);

  const { data: existing, error: selectError } = await supabase
    .from("devices")
    .select("id")
    .eq("id", deviceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (selectError && isMissingTableError(selectError.message)) {
    // Telemetry tables not installed (migration 0017 pending): report skipped
    // with 200 so the beacon stops retrying instead of spamming 404s.
    // Auth, placement and learning features are unaffected.
    const res = NextResponse.json({ ok: true, stored: false, reason: "telemetry_unavailable" });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  const isNew = !existing;

  // The devices PK is the fingerprint hash (global), while a row logically
  // belongs to one user — so a second user on the same hardware (or one user
  // with two accounts, the exact case this table detects) collides on id.
  // A blind upsert would UPDATE another user's row and trip RLS (42501), then
  // the beacon would retry on every page load. Instead: update own row,
  // insert when absent, and treat a unique-violation as a shared-device
  // signal — never a 500.
  const row = {
    id: deviceId,
    user_id: user.id,
    last_seen: new Date().toISOString(),
    user_agent: net.userAgent,
    platform: fp.platform,
    screen: fp.screen,
    timezone: fp.timezone,
    language: fp.language,
  } as never;

  let sharedDevice = false;
  if (existing) {
    const { error: updateError } = await supabase
      .from("devices")
      .update(row)
      .eq("id", deviceId)
      .eq("user_id", user.id);
    if (updateError) {
      if (isMissingTableError(updateError.message)) {
        const res = NextResponse.json({ ok: true, stored: false, reason: "telemetry_unavailable" });
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
      if (isRlsOwnershipError(updateError as { message?: string; code?: unknown })) {
        return NextResponse.json(
          { error: "Session expired. Refresh and retry.", code: "session_expired" },
          { status: 401 }
        );
      }
      return NextResponse.json({ error: "Could not save device." }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabase.from("devices").insert(row);
    if (!insertError) {
    } else if (isMissingTableError(insertError.message)) {
      const res = NextResponse.json({ ok: true, stored: false, reason: "telemetry_unavailable" });
      res.headers.set("Cache-Control", "no-store");
      return res;
    } else if (isRlsOwnershipError(insertError)) {
      // RLS WITH CHECK (auth.uid() = user_id) failed: session expired between
      // getUser() and insert, or user_id mismatch. Never 500 — tell the client
      // to refresh the session and retry once. Policy stays strict by design.
      console.warn("[security] device insert rejected by ownership policy", {
        code: (insertError as { code?: unknown }).code ?? null,
      });
      return NextResponse.json(
        { error: "Session expired. Refresh and retry.", code: "session_expired" },
        { status: 401 }
      );
    } else if (String((insertError as { code?: unknown }).code ?? "") === "23505") {
      // Unique violation: either our own parallel tab won the race, or the
      // fingerprint belongs to another user. Re-read to tell them apart.
      const { data: raced } = await supabase
        .from("devices")
        .select("id")
        .eq("id", deviceId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (raced) {
        await supabase.from("devices").update(row).eq("id", deviceId).eq("user_id", user.id);
      } else {
        sharedDevice = true;
      }
    } else {
      return NextResponse.json({ error: "Could not save device." }, { status: 500 });
    }
  }

  if (sharedDevice) {
    // Same hardware fingerprint as another account: keep the multi-account
    // signal (device_new with shared_device flag) without touching their row.
    await logSecurityEvent(supabase, {
      userId: user.id,
      type: "device_new",
      net,
      deviceId,
      meta: {
        platform: fp.platform,
        shared_device: true,
        landing: fp.landing || null,
        referrer: fp.referrer || null,
        utm_source: fp.utmSource || null,
        utm_medium: fp.utmMedium || null,
        utm_campaign: fp.utmCampaign || null,
      },
    });
    const res = NextResponse.json({ ok: true, stored: false, reason: "shared_device", deviceId, isNew: true });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  if (isNew) {
    await logSecurityEvent(supabase, {
      userId: user.id,
      type: "device_new",
      net,
      deviceId,
      meta: {
        platform: fp.platform,
        landing: fp.landing || null,
        referrer: fp.referrer || null,
        utm_source: fp.utmSource || null,
        utm_medium: fp.utmMedium || null,
        utm_campaign: fp.utmCampaign || null,
      },
    });
  }

  const res = NextResponse.json({ ok: true, deviceId, isNew });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * True when PostgREST rejected the row via the user-ownership RLS policy:
 *   new row violates row-level security policy (42501) or
 *   new row violates row-level security policy for table "devices".
 * Callers map this to 401 (refresh session), never 500, and never loosen RLS.
 */
function isRlsOwnershipError(error: { message?: string; code?: unknown } | null | undefined): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  if (code === "42501") return true;
  return /row-level security|violates row-level security|ownership policy|new row violates/i.test(
    error.message ?? ""
  );
}
