/** Guest placement carry-over: a test taken before signup must never be retaken. */

import { readJson } from "@/lib/api/response";

export const GUEST_PLACEMENT_KEY = "linguaai:guest:placement-result";
/** Guest results older than this are dropped (stale answers should not resurrect). */
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export interface GuestPlacement {
  answers: Array<{ questionId: string; selected: number }>;
  reading?: Array<{ questionId: string; selected: number }>;
  listening?: Array<{ questionId: string; selected: number }>;
  spelling?: Array<{ slug: string; typed?: string; selected?: number; choices?: string[] }>;
  writingText?: string;
  speakingTranscript?: string;
  speakingSecs?: number;
  pronunciationTranscript?: string;
  pronunciationSecs?: number;
  testVersion?: string;
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
  payload: {
    answers: GuestPlacement["answers"];
    reading?: GuestPlacement["reading"];
    listening?: GuestPlacement["listening"];
    spelling?: GuestPlacement["spelling"];
    writingText?: string;
    speakingTranscript?: string;
    speakingSecs?: number;
    pronunciationTranscript?: string;
    pronunciationSecs?: number;
    testVersion?: string;
    learningMode?: "guided" | "free";
  }
): void {
  try {
    const clean = payload.answers
      .filter((a) => typeof a.questionId === "string" && a.questionId.length > 0 && Number.isInteger(a.selected))
      .slice(0, 100);
    const reading = (payload.reading ?? [])
      .filter((a) => typeof a.questionId === "string" && a.questionId.length > 0 && Number.isInteger(a.selected))
      .slice(0, 50);
    const listening = (payload.listening ?? [])
      .filter((a) => typeof a.questionId === "string" && a.questionId.length > 0 && Number.isInteger(a.selected))
      .slice(0, 50);
    const spelling = (payload.spelling ?? [])
      .filter((a) => !!a && typeof a.slug === "string" && a.slug.length > 0)
      .slice(0, 30);
    const hasProductive =
      String(payload.writingText ?? "").trim().length > 0 ||
      String(payload.speakingTranscript ?? "").trim().length > 0 ||
      String(payload.pronunciationTranscript ?? "").trim().length > 0;
    if (clean.length === 0 && reading.length === 0 && listening.length === 0 && spelling.length === 0 && !hasProductive)
      return;
    const doc: GuestPlacement = {
      answers: clean,
      reading,
      listening,
      spelling,
      writingText: String(payload.writingText ?? "").slice(0, 3000),
      speakingTranscript: String(payload.speakingTranscript ?? "").slice(0, 3000),
      speakingSecs: Math.max(0, Math.min(3600, Math.round(Number(payload.speakingSecs) || 0))),
      pronunciationTranscript: String(payload.pronunciationTranscript ?? "").slice(0, 2000),
      pronunciationSecs: Math.max(0, Math.min(3600, Math.round(Number(payload.pronunciationSecs) || 0))),
      testVersion: payload.testVersion ?? "v3-multi",
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
    const answers = Array.isArray(doc.answers)
      ? doc.answers
          .filter(
            (a): a is GuestPlacement["answers"][number] =>
              !!a && typeof a.questionId === "string" && a.questionId.length > 0 && Number.isInteger(a.selected)
          )
          .slice(0, 100)
      : [];
    const reading = Array.isArray(doc.reading)
      ? doc.reading
          .filter((a): a is NonNullable<GuestPlacement["reading"]>[number] =>
            !!a && typeof (a as { questionId?: unknown }).questionId === "string" && Number.isInteger((a as { selected?: unknown }).selected)
          )
          .slice(0, 50)
      : [];
    const listening = Array.isArray(doc.listening)
      ? doc.listening
          .filter((a): a is NonNullable<GuestPlacement["listening"]>[number] =>
            !!a && typeof (a as { questionId?: unknown }).questionId === "string" && Number.isInteger((a as { selected?: unknown }).selected)
          )
          .slice(0, 50)
      : [];
    const spelling = Array.isArray(doc.spelling)
      ? (doc.spelling as Array<{ slug: string; typed?: string; selected?: number; choices?: string[] }>)
          .filter((a) => !!a && typeof a.slug === "string")
          .slice(0, 30)
      : [];
    const hasProductive =
      String(doc.writingText ?? "").trim().length > 0 ||
      String(doc.speakingTranscript ?? "").trim().length > 0 ||
      String(doc.pronunciationTranscript ?? "").trim().length > 0;
    if (answers.length === 0 && reading.length === 0 && listening.length === 0 && spelling.length === 0 && !hasProductive)
      return null;
    if (typeof doc.savedAt !== "number" || Date.now() - doc.savedAt > MAX_AGE_MS) return null;
    return {
      answers,
      reading,
      listening,
      spelling,
      writingText: String(doc.writingText ?? "").slice(0, 3000),
      speakingTranscript: String(doc.speakingTranscript ?? "").slice(0, 3000),
      speakingSecs: Math.max(0, Math.min(3600, Math.round(Number(doc.speakingSecs) || 0))),
      pronunciationTranscript: String(doc.pronunciationTranscript ?? "").slice(0, 2000),
      pronunciationSecs: Math.max(0, Math.min(3600, Math.round(Number(doc.pronunciationSecs) || 0))),
      testVersion: typeof doc.testVersion === "string" ? doc.testVersion : "v3-multi",
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
    const status = (await readJson(statusRes).catch(() => null)) as {
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
      body: JSON.stringify({
        answers: guest.answers,
        reading: guest.reading ?? [],
        listening: guest.listening ?? [],
        spelling: guest.spelling ?? [],
        writingText: guest.writingText ?? "",
        speakingTranscript: guest.speakingTranscript ?? "",
        speakingSecs: guest.speakingSecs ?? 0,
        pronunciationTranscript: guest.pronunciationTranscript ?? "",
        pronunciationSecs: guest.pronunciationSecs ?? 0,
        testVersion: guest.testVersion ?? "v3-multi",
        learningMode: guest.learningMode,
        // Stable per-device key: safe retries never append duplicate history.
        idempotencyKey: `guest-migrate-${String(guest.savedAt ?? 0)}`,
      }),
    });
    const json = (await readJson(submitRes).catch(() => null)) as { saved?: boolean } | null;
    if (submitRes.ok && json?.saved === true) {
      clearGuestPlacement(s);
      return "migrated";
    }
    return "failed";
  } catch {
    return "failed";
  }
}
