/** Shared XP + streak + activity writer (server-only). */
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database";

export interface AwardInput {
  amount: number;
  source: string;
  activityKind?: string;
  activityTitle?: string;
  activityHref?: string;
}

type AtomicAwardResult = {
  data: unknown;
  error: { message: string } | null;
};

/** Records XP, activity and streak counters in one database transaction. */
export async function awardXp(
  _supabase: unknown,
  userId: string,
  input: AwardInput,
  now = new Date()
): Promise<{ streak: { current: number; longest: number }; xpToday: number }> {
  // XP is server-authoritative. Calling this with the user's client would
  // require exposing a privileged RPC to every authenticated browser session.
  const service = createServiceClient();
  const rpcClient = service as unknown as { rpc: (
    name: "award_xp_atomic",
    args: Database["public"]["Functions"]["award_xp_atomic"]["Args"]
  ) => PromiseLike<AtomicAwardResult> };
  const { data, error } = await rpcClient.rpc("award_xp_atomic", {
    p_user_id: userId,
    p_amount: input.amount,
    p_source: input.source,
    p_activity_kind: input.activityKind ?? null,
    p_activity_title: input.activityTitle ?? null,
    p_activity_href: input.activityHref ?? null,
    p_now: now.toISOString(),
  });
  if (error) {
    console.error("[award] atomic XP transaction failed", { message: error.message, source: input.source });
    throw new Error("Could not record XP.");
  }
  const result = data as { streak?: { current?: number; longest?: number }; xpToday?: number } | null;
  return {
    streak: {
      current: Number(result?.streak?.current ?? 0),
      longest: Number(result?.streak?.longest ?? 0),
    },
    xpToday: Number(result?.xpToday ?? input.amount),
  };
}
