import "server-only";

import { getDataMode } from "@/lib/repositories/data-mode";
import { createClient } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email: string | null;
};

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  if (getDataMode() === "mock") {
    // UI shell / unit tests without Supabase session — never elevate from client flags.
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (data?.role !== "ADMIN") return null;

  return { id: user.id, email: user.email ?? null };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const admin = await getCurrentAdminUser();
  return admin !== null;
}
