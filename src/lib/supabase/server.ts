import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const cookieStore = cookies();
  return createServerClient<Database>(url, anon, {
    cookies: {
      getAll: async () => (await cookieStore).getAll(),
      setAll: async (cookiesToSet: Array<{ name: string; value: string; options: unknown }>) => {
        try {
          const store = await cookieStore;
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options as Parameters<typeof store.set>[2])
          );
        } catch { /* Server Component — middleware refreshes session */ }
      }
    }
  });
}
