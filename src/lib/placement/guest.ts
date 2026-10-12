/** Guest placement carry-over: a test taken before signup must never be retaken. */

export const GUEST_PLACEMENT_KEY = "linguaai:guest:placement-result";
/** Guest results older than this are dropped (stale answers should not resurrect). */
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export interface GuestPlacement {
  answers: Array<{ questionId: string; selected: number }>;
  learningMode?: "guided" | "free";
  savedAt: number;
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function store(): Store | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Persist a guest's graded answers so signup can replay them (best-effort). */
export function saveGuestPlacement(
  s: Store,
  payload: { answers: GuestPlacement["answers"]; learningMode?: "guided" | "free" }
): void {
  try {
    const clean = payload.answers
      .filter((a) => typeof a.questionId === "string" && a.questionId.length > 0 && Number.isInteger(a.selected))
      .slice(0, 100);
    if (clean.length === 0) return;
    const doc: GuestPlacement = {
      answers: clean,
      learningMode: payload.learningMode === "free" ? "free" : "guided",
      savedAt: Date.now(),
    };
    s.setItem(GUEST_PLACEMENT_KEY, JSON.stringify(doc));
  } catch {
    /* never break the test for telemetry */
  }
}

/** Read a stored guest result; null when missing, corrupt, or expired. */
export function readGuestPlacement(s: Store): GuestPlacement | null {
  try {
    const raw = s.getItem(GUEST_PLACEMENT_KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as Partial<GuestPlacement>;
    if (!Array.isArray(doc.answers) || doc.answers.length === 0) return null;
    if (typeof doc.savedAt !== "number" || Date.now() - doc.savedAt > MAX_AGE_MS) return null;
    const answers = doc.answers
      .filter(
        (a): a is GuestPlacement["answers"][number] =>
          !!a && typeof a.questionId === "string" && a.questionId.length > 0 && Number.isInteger(a.selected)
      )
      .slice(0, 100);
    if (answers.length === 0) return null;
    return {
      answers,
      learningMode: doc.learningMode === "free" ? "free" : "guided",
      savedAt: doc.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearGuestPlacement(s: Store): void {
  try {
    s.removeItem(GUEST_PLACEMENT_KEY);
  } catch {
    /* noop */
  }
}

export type MigrateResult = "migrated" | "already-placed" | "nothing" | "failed";

/**
 * Replay a stored guest placement into the fresh account. Server wins:
 * when the profile already has a level, the guest result is dropped.
 * Safe to call on every login; no-ops without a stored result.
 */
export async function migrateGuestPlacement(): Promise<MigrateResult> {
  const s = store();
  if (!s) return "nothing";
  const guest = readGuestPlacement(s);
  if (!guest) return "nothing";
  try {
    const statusRes = await fetch("/api/me/status", { cache: "no-store" });
    if (statusRes.status === 401) return "nothing";
    const status = (await statusRes.json().catch(() => null)) as {
      level?: string | null;
      placementCompleted?: boolean;
    } | null;
    if (status && (status.placementCompleted === true || (typeof status.level === "string" && status.level.length > 0))) {
      clearGuestPlacement(s);
      return "already-placed";
    }
    const submitRes = await fetch("/api/placement/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: guest.answers, learningMode: guest.learningMode }),
    });
    const json = (await submitRes.json().catch(() => null)) as { saved?: boolean } | null;
    if (submitRes.ok && json?.saved === true) {
      clearGuestPlacement(s);
      return "migrated";
    }
    return "failed";
  } catch {
    return "failed";
  }
}
