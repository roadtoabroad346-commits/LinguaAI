"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

let singleton: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Singleton browser client — one cookie-based session shared by every component. */
export function createClient() {
  if (singleton) return singleton;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  singleton = createBrowserClient<Database>(url, anon);
  return singleton;
}

/** Test-only reset for the singleton. */
export function __resetBrowserClient() {
  singleton = null;
}
