/**
 * Verify PHASE T1 migration 0009 on local/remote Supabase.
 * Secrets are never printed.
 *
 * Usage: node --env-file=.env.local scripts/verify-tarot-migration.cjs
 */
const { createClient } = require("@supabase/supabase-js");
const { Client } = require("pg");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) {
    console.error("MISSING Supabase env");
    process.exit(2);
  }

  console.log("## Tarot Migration 0009 Probe\n");
  console.log(`API host: ${new URL(url).host}\n`);

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const t of ["tarot_readings", "tarot_draws"]) {
    const { error } = await admin.from(t).select("id").limit(1);
    console.log(`REST ${t}: ${error ? `FAIL — ${error.message}` : "OK"}`);
  }

  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    (url.includes("127.0.0.1") || url.includes("localhost")
      ? "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      : null);

  if (!dbUrl) {
    console.log("\nDB SQL probe: SKIPPED (no DATABASE_URL for remote)");
    return;
  }

  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();

  const rls = await pg.query(
    `select relname, relrowsecurity from pg_class where relname in ('tarot_readings','tarot_draws') order by relname`
  );
  for (const row of rls.rows) {
    console.log(`RLS ${row.relname}: ${row.relrowsecurity ? "ENABLED" : "DISABLED"}`);
  }

  const cons = await pg.query(
    `select conname from pg_constraint where conname like 'tarot%' or conname = 'ai_generations_result_type_check' order by conname`
  );
  console.log(`Constraints: ${cons.rows.map((r) => r.conname).join(", ") || "(none)"}`);

  const check = await pg.query(
    `select pg_get_constraintdef(c.oid) as def from pg_constraint c where c.conname = 'ai_generations_result_type_check'`
  );
  console.log(`ai_generations.result_type: ${check.rows[0]?.def || "MISSING"}`);

  const pol = await pg.query(
    `select tablename, policyname from pg_policies where tablename in ('tarot_readings','tarot_draws') order by 1,2`
  );
  console.log(
    `Policies: ${pol.rows.map((r) => `${r.tablename}:${r.policyname}`).join(", ") || "(none)"}`
  );

  await pg.end();
  console.log("\nRESULT: migration probe complete");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
