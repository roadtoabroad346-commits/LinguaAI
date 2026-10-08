import { createClient as createJsClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client for trusted server code only (migrations verification,
 * admin backfills). Never import from client components.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error("Service client is not configured (missing URL or SERVICE_ROLE key).");
  }
  return createJsClient<Database>(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
