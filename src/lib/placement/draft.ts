/** Placement v3 draft: autosaved progress that survives refresh + sign-in.
 * Per-user namespaced keys so guests and accounts never leak into each other.
 * Server remains the source of truth for COMPLETED results; the draft only
 * covers in-progress attempts (honest, offline-friendly, no fake success).
 */
import { PLACEMENT_TEST_VERSION } from "./sections";

export const PLACEMENT_DRAFT_VERSION = 3;
const DRAFT_TTL_MS = 30 * 24 * 3600 * 1000;

export interface PlacementDraft {
  version: number;
  testVersion: string;
  status: "in_progress" | "completed";
  attemptKey: string;
  startedAt: number;
  updatedAt: number;
  sectionIndex: number;
  questionIndex: number;
  answers: Record<string, number>;
  reading: Record<string, number>;
  listening: Record<string, number>;
  spelling: Record<string, { typed?: string; selected?: number; choices?: string[] }>;
  writingText: string;
  speakingTranscript: string;
  speakingSecs: number;
  pronunciationTranscript: string;
  pronunciationSecs: number;
  learningMode: "guided" | "free";
}

export function draftKey(owner: string): string {
  return `linguaai:${owner}:placement-draft-v3`;
}

export function draftOwner(signedIn: boolean, userId?: string | null): string {
  if (signedIn && userId) return `user:${userId}`;
  return "guest";
}

function mempty(attemptKey: string): PlacementDraft {
  const now = Date.now();
  return {
    version: PLACEMENT_DRAFT_VERSION,
    testVersion: PLACEMENT_TEST_VERSION,
    status: "in_progress",
    attemptKey,
    startedAt: now,
    updatedAt: now,
    sectionIndex: 0,
    questionIndex: 0,
    answers: {},
    reading: {},
    listening: {},
    spelling: {},
    writingText: "",
    speakingTranscript: "",
    speakingSecs: 0,
    pronunciationTranscript: "",
    pronunciationSecs: 0,
    learningMode: "guided",
  };
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function safeStore(): Store | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function newDraft(attemptKey: string): PlacementDraft {
  return mempty(attemptKey);
}

export function loadDraft(store: Store, owner: string): PlacementDraft | null {
  try {
    const raw = store.getItem(draftKey(owner));
    if (!raw) return null;
    const doc = JSON.parse(raw) as Partial<PlacementDraft>;
    if (doc.version !== PLACEMENT_DRAFT_VERSION) return null;
    if (doc.status === "completed") return null;
    if (typeof doc.updatedAt !== "number" || Date.now() - doc.updatedAt > DRAFT_TTL_MS) return null;
    if (typeof doc.attemptKey !== "string" || doc.attemptKey.length < 4) return null;
    const base = mempty(doc.attemptKey);
    return {
      ...base,
      ...doc,
      answers: { ...(doc.answers ?? {}) },
      reading: { ...(doc.reading ?? {}) },
      listening: { ...(doc.listening ?? {}) },
      spelling: { ...(doc.spelling ?? {}) },
      writingText: String(doc.writingText ?? "").slice(0, 3000),
      speakingTranscript: String(doc.speakingTranscript ?? "").slice(0, 3000),
      pronunciationTranscript: String(doc.pronunciationTranscript ?? "").slice(0, 2000),
      status: "in_progress",
    } as PlacementDraft;
  } catch {
    return null;
  }
}

export function saveDraft(store: Store, owner: string, draft: PlacementDraft): void {
  try {
    const doc: PlacementDraft = {
      ...draft,
      version: PLACEMENT_DRAFT_VERSION,
      testVersion: PLACEMENT_TEST_VERSION,
      status: "in_progress",
      updatedAt: Date.now(),
      writingText: String(draft.writingText ?? "").slice(0, 3000),
      speakingTranscript: String(draft.speakingTranscript ?? "").slice(0, 3000),
      pronunciationTranscript: String(draft.pronunciationTranscript ?? "").slice(0, 2000),
    };
    store.setItem(draftKey(owner), JSON.stringify(doc));
  } catch {
    /* best-effort: never break the test for persistence */
  }
}

export function clearDraft(store: Store, owner: string): void {
  try {
    store.removeItem(draftKey(owner));
  } catch {
    /* noop */
  }
}

/** Browser helpers that never throw (used by the runner). */
export function loadBrowserDraft(owner: string): PlacementDraft | null {
  const s = safeStore();
  if (!s) return null;
  return loadDraft(s, owner);
}

export function saveBrowserDraft(owner: string, draft: PlacementDraft): void {
  const s = safeStore();
  if (!s) return;
  saveDraft(s, owner, draft);
}

export function clearBrowserDraft(owner: string): void {
  const s = safeStore();
  if (!s) return;
  clearDraft(s, owner);
}

/** Server payload mapping (shared by client sync + API validation). */
export interface ServerDraftPayload {
  answers: Record<string, number>;
  reading: Record<string, number>;
  listening: Record<string, number>;
  spelling: Record<string, { typed?: string; selected?: number; choices?: string[] }>;
  writingText: string;
  speakingTranscript: string;
  speakingSecs: number;
  pronunciationTranscript: string;
  pronunciationSecs: number;
  learningMode: "guided" | "free";
}

export function draftToPayload(d: PlacementDraft): ServerDraftPayload {
  return {
    answers: { ...d.answers },
    reading: { ...d.reading },
    listening: { ...d.listening },
    spelling: { ...d.spelling },
    writingText: String(d.writingText ?? "").slice(0, 3000),
    speakingTranscript: String(d.speakingTranscript ?? "").slice(0, 3000),
    speakingSecs: Math.max(0, Math.min(600, Math.round(d.speakingSecs || 0))),
    pronunciationTranscript: String(d.pronunciationTranscript ?? "").slice(0, 2000),
    pronunciationSecs: Math.max(0, Math.min(600, Math.round(d.pronunciationSecs || 0))),
    learningMode: d.learningMode === "free" ? "free" : "guided",
  };
}

export function draftTouched(d: PlacementDraft): boolean {
  return (
    Object.keys(d.answers).length +
      Object.keys(d.reading).length +
      Object.keys(d.listening).length +
      Object.keys(d.spelling).length +
      (d.writingText.trim().length > 0 ? 1 : 0) +
      (d.speakingTranscript.trim().length > 0 ? 1 : 0) +
      (d.pronunciationTranscript.trim().length > 0 ? 1 : 0) >
    0
  );
}

export function payloadToDraft(
  attemptKey: string,
  sectionIndex: number,
  payload: Partial<ServerDraftPayload>,
  base?: PlacementDraft
): PlacementDraft {
  const b = base ?? mempty(attemptKey);
  return {
    ...b,
    version: PLACEMENT_DRAFT_VERSION,
    testVersion: PLACEMENT_TEST_VERSION,
    status: "in_progress",
    attemptKey,
    sectionIndex: Math.max(0, Math.min(19, Math.round(sectionIndex || 0))),
    updatedAt: Date.now(),
    answers: { ...((payload.answers ?? {}) as Record<string, number>) },
    reading: { ...((payload.reading ?? {}) as Record<string, number>) },
    listening: { ...((payload.listening ?? {}) as Record<string, number>) },
    spelling: { ...((payload.spelling ?? {}) as PlacementDraft["spelling"]) },
    writingText: String(payload.writingText ?? "").slice(0, 3000),
    speakingTranscript: String(payload.speakingTranscript ?? "").slice(0, 3000),
    speakingSecs: Math.max(0, Math.min(600, Math.round(Number(payload.speakingSecs) || 0))),
    pronunciationTranscript: String(payload.pronunciationTranscript ?? "").slice(0, 2000),
    pronunciationSecs: Math.max(0, Math.min(600, Math.round(Number(payload.pronunciationSecs) || 0))),
    learningMode: payload.learningMode === "free" ? "free" : "guided",
  };
}
