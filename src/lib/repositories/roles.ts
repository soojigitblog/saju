import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createClient } from "@/lib/supabase/server";

export async function isCurrentUserAdmin(): Promise<boolean> {
  if (getDataMode() === "mock") {
    // UI shell only — never treat localStorage / client flags as admin.
    return false;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data?.role === "ADMIN";
}
