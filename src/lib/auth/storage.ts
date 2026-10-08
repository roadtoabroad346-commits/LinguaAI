/** Namespaced client-storage hygiene (Step 5). Device prefs may stay local; account data must not. */

export type StorageOwner = string | "guest";

export function namespacedKey(owner: StorageOwner, key: string): string {
  const safeOwner = owner === "guest" || !owner ? "guest" : owner;
  return `linguaai:${safeOwner}:${key}`;
}

/** Keys that are allowed to stay device-local (never contain account data). */
export const DEVICE_ONLY_KEYS = new Set([
  "linguaai_theme",
  "linguaai_reduced_motion",
  "linguaai_haptics",
  "linguaai_playback_speed",
  "linguaai_locale",
  "linguaai_flash_mode",
  "linguaai_flash_dir",
  "linguaai_flash_shuffle",
]);

/** Legacy global keys that must be migrated to namespaced guest keys, then cleared on auth change. */
export const GUEST_MIGRATABLE_KEYS = [
  "linguaai:saved-words",
  "linguaai_flash_fav",
] as const;

/** User-scoped keys (current + legacy) that must be wiped on sign-out / user switch. */
export const USER_SCOPED_KEYS = [
  ...GUEST_MIGRATABLE_KEYS,
  "linguaai_locale",
] as const;

export interface GuestSnapshot {
  savedWords: string[];
  favorites: string[];
}

/** Read guest data once (best-effort, never throws). */
export function readGuestData(store: Pick<Storage, "getItem">): GuestSnapshot {
  const savedWords = safeStringArray(store.getItem("linguaai:saved-words"));
  const favorites = safeStringArray(store.getItem("linguaai_flash_fav"));
  return { savedWords, favorites };
}

function safeStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 2000);
  } catch {
    return [];
  }
}

export interface MergeDecision {
  /** Words safe to insert (not already on the server). */
  wordsToImport: string[];
  /** Favorites safe to keep locally (server has no equivalent table; keep as-is). */
  favoritesToKeep: string[];
  /** True when the server already has a completed placement — never overwrite it. */
  placementLocked: boolean;
}

/**
 * Guest -> account merge rules: server wins on conflict.
 * Never overwrites an existing completed placement.
 */
export function decideGuestMerge(opts: {
  guest: GuestSnapshot;
  serverWords: string[];
  placementCompleted: boolean;
}): MergeDecision {
  const serverSet = new Set(opts.serverWords.map((w) => w.toLowerCase()));
  const wordsToImport = opts.guest.savedWords.filter((w) => !serverSet.has(w.toLowerCase())).slice(0, 500);
  return {
    wordsToImport,
    favoritesToKeep: opts.guest.favorites.slice(0, 500),
    placementLocked: opts.placementCompleted,
  };
}

/** Remove all user-scoped keys from the given store (sign-out / user-switch hygiene). */
export function clearUserScopedKeys(store: Pick<Storage, "getItem" | "removeItem" | "length" | "key">): void {
  try {
    for (const k of USER_SCOPED_KEYS) {
      try {
        store.removeItem(k);
      } catch {
        /* noop */
      }
    }
    // Also drop any namespaced per-user keys from previous sessions.
    const doomed: string[] = [];
    try {
      const n = store.length;
      for (let i = 0; i < n; i++) {
        const k = store.key(i);
        if (k && k.startsWith("linguaai:")) doomed.push(k);
      }
    } catch {
      /* non-standard store */
    }
    for (const k of doomed) {
      try {
        store.removeItem(k);
      } catch {
        /* noop */
      }
    }
  } catch {
    /* best-effort */
  }
}
