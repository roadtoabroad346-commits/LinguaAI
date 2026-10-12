import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/security/telemetry";
import { parsePrefs } from "@/lib/notifications/prefs";
import { NOTIF_CATEGORIES } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" } as const;

const categoryMap = z.object(
  Object.fromEntries(NOTIF_CATEGORIES.map((c) => [c, z.boolean().optional()])) as Record<
    (typeof NOTIF_CATEGORIES)[number],
    z.ZodOptional<z.ZodBoolean>
  >
);

const prefsSchema = z.object({
  enabled: z.boolean().optional(),
  categories: categoryMap.optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietFrom: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietTo: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  dailyMax: z.number().int().min(1).max(20).optional(),
});

/** GET /api/notifications/preferences — merged prefs (defaults + stored). */
export async function GET() {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503, headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: noStore });
  const { data: profile } = await supabase.from("profiles").select("preferences").eq("id", user.id).maybeSingle();
  const prefs = parsePrefs((profile as { preferences?: Record<string, unknown> } | null)?.preferences?.notifs);
  return NextResponse.json({ prefs }, { headers: noStore });
}

/** PATCH /api/notifications/preferences — merge partial prefs into profiles.preferences. */
export async function PATCH(request: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503, headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: noStore });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: noStore });
  }
  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences.", issues: parsed.error.flatten() }, { status: 400, headers: noStore });
  }
  const { data: profile } = await supabase.from("profiles").select("preferences").eq("id", user.id).maybeSingle();
  const current = ((profile as { preferences?: Record<string, unknown> } | null)?.preferences ?? {}) as Record<string, unknown>;
  const merged = parsePrefs({ ...(current.notifs as Record<string, unknown> | undefined), ...parsed.data });
  const { error } = await supabase
    .from("profiles")
    .update({ preferences: { ...current, notifs: merged } } as never)
    .eq("id", user.id);
  if (error) {
    if (isMissingTableError(error.message)) {
      return NextResponse.json({ error: "Notifications are not installed yet." }, { status: 503, headers: noStore });
    }
    return NextResponse.json({ error: "Could not save preferences." }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ ok: true, prefs: merged }, { headers: noStore });
}
