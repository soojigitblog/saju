import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

/**
 * Browser / Client Component Supabase client.
 * Uses NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY only — must respect RLS.
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createBrowserClient<Database>(
    getSupabaseUrl()!,
    getSupabasePublishableKey()!
  );
}
