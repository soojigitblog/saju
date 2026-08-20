import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/env";

/**
 * Privileged server-only client (SUPABASE_SECRET_KEY).
 * Bypasses RLS — use only after explicit authorization in trusted Route Handlers / jobs.
 *
 * Do NOT use this as a convenience shortcut for normal user reads/writes.
 * Normal user traffic must use server/user client + RLS.
 */
export function createAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      "Supabase admin is not configured. Set SUPABASE_SECRET_KEY."
    );
  }

  return createClient<Database>(getSupabaseUrl()!, getSupabaseSecretKey()!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
