/**
 * Grant ADMIN role to an existing Supabase Auth user by email.
 *
 * Usage:
 *   npx tsx --require ./scripts/shim-server-only.cjs scripts/admin-grant.ts --email=you@example.com
 *
 * Create the Auth user first in Supabase Dashboard (Authentication → Users),
 * then run this script to insert/update public.user_roles.
 */
import { createClient } from "@supabase/supabase-js";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run admin:grant -- --email=you@example.com");
    process.exit(1);
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const secret =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!url || !secret) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    console.error(listErr.message);
    process.exit(1);
  }

  const user = listed.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    console.error(
      `Auth user not found for ${email}. Create the user in Supabase Auth first.`
    );
    process.exit(1);
  }

  const { error } = await admin.from("user_roles").upsert({
    user_id: user.id,
    role: "ADMIN",
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`OK: ${email} (${user.id}) → ADMIN`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
