import { sortDescriptors } from "./generator";
import type { NotificationDescriptor } from "./types";

export interface SyncExisting {
  key: string;
  dismissedAt: string | null;
  resolvedAt: string | null;
}

export interface SyncPlan {
  /** Descriptors to insert (already filtered, capped, ordered). */
  insert: NotificationDescriptor[];
  /** Keys to re-arm (resolved earlier, condition true again). */
  rearm: string[];
  /** Keys to resolve (condition cleared). */
  resolve: string[];
}

/**
 * Pure reconcile: generated set + stored rows -> minimal DB writes.
 * - Dismissed rows are NEVER resurrected (user said no).
 * - Resolved rows re-arm when the condition returns.
 * - Cleared conditions resolve (history kept, badge unaffected).
 * - Daily cap counts rows created today; overflow waits for tomorrow's key.
 */
export function planSync(
  generated: NotificationDescriptor[],
  existing: Map<string, SyncExisting>,
  opts: { createdToday: number; dailyMax: number }
): SyncPlan {
  const insert: NotificationDescriptor[] = [];
  const rearm: string[] = [];
  const genKeys = new Set(generated.map((g) => g.key));

  let created = opts.createdToday;
  for (const g of sortDescriptors(generated)) {
    const row = existing.get(g.key);
    if (!row) {
      if (created < opts.dailyMax) {
        insert.push(g);
        created += 1;
      }
      continue;
    }
    if (row.dismissedAt) continue; // user dismissed: stays buried
    if (row.resolvedAt) rearm.push(g.key);
  }

  const resolve: string[] = [];
  for (const [key, row] of Array.from(existing.entries())) {
    if (!genKeys.has(key) && !row.resolvedAt && !row.dismissedAt) resolve.push(key);
  }

  return { insert, rearm, resolve };
}
