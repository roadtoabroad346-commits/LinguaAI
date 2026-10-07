/** Phase 2 — shared XP + streak + activity writer (server-only). */
import { dateKeyInTimezone, nextStreakState, startOfDayUtc } from "./streak";

// Loose client type: server Supabase client generics vary across versions;
// structural typing via `any` keeps awardXp usable from all routes.
type Client = {
  from(table: string): any;
};

export interface AwardInput {
  amount: number;
  source: string;
  activityKind?: string;
  activityTitle?: string;
  activityHref?: string;
}

/** Records xp_events + activity_events and advances profile streak counters (timezone-aware). */
export async function awardXp(
  supabase: Client,
  userId: string,
  input: AwardInput,
  now = new Date()
): Promise<{ streak: { current: number; longest: number }; xpToday: number }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_streak,longest_streak,last_active_date,total_xp,timezone")
    .eq("id", userId)
    .maybeSingle();
  const p = (profile ?? {}) as { current_streak?: number; longest_streak?: number; last_active_date?: string | null; total_xp?: number; timezone?: string | null };
  const timezone = p.timezone ?? "UTC";
  const today = dateKeyInTimezone(now, timezone);

  const { error: xpError } = await supabase.from("xp_events").insert({
    user_id: userId,
    amount: input.amount,
    source: input.source,
  } as never);
  if (xpError) throw new Error("Could not record XP.");

  if (input.activityKind && input.activityTitle) {
    await supabase.from("activity_events").insert({
      user_id: userId,
      kind: input.activityKind,
      title: input.activityTitle,
      subtitle: null,
      href: input.activityHref ?? null,
      xp: input.amount,
    } as never);
  }

  const next = nextStreakState(
    { current: p.current_streak ?? 0, longest: p.longest_streak ?? 0, lastActiveDate: p.last_active_date ?? null },
    today
  );
  await supabase
    .from("profiles")
    .update({ current_streak: next.current, longest_streak: next.longest, last_active_date: today, total_xp: (p.total_xp ?? 0) + input.amount } as never)
    .eq("id", userId);

  const dayStart = startOfDayUtc(now, timezone);
  const { data: todayEvents } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId)
    .gte("created_at", dayStart.toISOString());
  const xpToday = ((todayEvents ?? []) as Array<{ amount: number }>).reduce((s, e) => s + (e.amount || 0), 0);

  return { streak: { current: next.current, longest: next.longest }, xpToday };
}
