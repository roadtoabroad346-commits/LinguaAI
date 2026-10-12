import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api/security";
import {
  deviceFingerprintSchema,
  getNetworkContext,
  hashDevice,
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
  const limited = checkRateLimit(request, { key: "security-device", limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

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

  const { data: existing } = await supabase
    .from("devices")
    .select("id")
    .eq("id", deviceId)
    .eq("user_id", user.id)
    .maybeSingle();
  const isNew = !existing;

  const { error: upsertError } = await supabase.from("devices").upsert(
    {
      id: deviceId,
      user_id: user.id,
      last_seen: new Date().toISOString(),
      user_agent: net.userAgent,
      platform: fp.platform,
      screen: fp.screen,
      timezone: fp.timezone,
      language: fp.language,
    } as never,
    { onConflict: "id" }
  );
  if (upsertError) {
    return NextResponse.json({ error: "Could not save device." }, { status: 500 });
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
