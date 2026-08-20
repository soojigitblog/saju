/**
 * Data access mode:
 * - Supabase credentials present → real DB (errors bubble; no silent mock fallback)
 * - Credentials absent + development/test → local mock
 * - Credentials absent + production runtime → hard error
 *
 * Avoids a DATA_SOURCE env flag that could be left as "mock" in production.
 */
import {
  assertProductionSupabaseConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export type DataMode = "supabase" | "mock";

export function getDataMode(): DataMode {
  if (isSupabaseConfigured()) return "supabase";

  assertProductionSupabaseConfig();

  // development / test / production-build without secrets
  return "mock";
}
