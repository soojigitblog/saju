/**
 * PHASE 5.1 — Live Supabase DB / RLS smoke (no AI key required).
 * Secrets are never printed.
 *
 *   node --env-file=.env.local scripts/phase51-live-db-smoke.cjs
 */
const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");

function req(name) {
  const v = process.env[name]?.trim();
  if (!v) {
    console.error(`MISSING ${name}`);
    process.exit(2);
  }
  return v;
}

const url = req("NEXT_PUBLIC_SUPABASE_URL");
const publishable = req("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secret = req("SUPABASE_SECRET_KEY");

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, publishable, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];

function mark(name, ok, detail) {
  results.push({ name, ok, detail: detail || "" });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("## PHASE 5.1 Live DB / RLS Smoke\n");

  // 1) migrations / tables
  for (const table of [
    "profiles",
    "fortune_charts",
    "free_results",
    "ai_generations",
    "prompt_definitions",
    "prompt_versions",
    "products",
  ]) {
    const { error } = await admin.from(table).select("*").limit(1);
    mark(`table ${table}`, !error, error?.message);
  }

  // 2) provider column
  {
    const { data, error } = await admin
      .from("ai_generations")
      .select("provider")
      .limit(1);
    mark("ai_generations.provider column", !error, error?.message);
    void data;
  }

  // 3) seed
  {
    const { data, error } = await admin
      .from("products")
      .select("slug")
      .eq("status", "ACTIVE");
    mark(
      "seed products",
      !error && (data?.length ?? 0) > 0,
      error?.message || `count=${data?.length ?? 0}`
    );
  }
  {
    const { data, error } = await admin
      .from("prompt_versions")
      .select("id,status")
      .eq("status", "ACTIVE");
    mark(
      "seed active prompts",
      !error && (data?.length ?? 0) > 0,
      error?.message || `count=${data?.length ?? 0}`
    );
  }

  // 4) guest ownership insert via admin (app path)
  const guestA = randomUUID();
  const guestB = randomUUID();

  const { data: profileA, error: pErr } = await admin
    .from("profiles")
    .insert({
      guest_session_id: guestA,
      nickname: "phase51-a",
      gender: "male",
      birth_date: "1990-05-15",
      birth_time: "10:30",
      birth_time_unknown: false,
      calendar_type: "solar",
      birth_place: "Seoul",
    })
    .select("id")
    .single();
  mark("guest A profile insert", !pErr && !!profileA?.id, pErr?.message);

  let chartId = null;
  if (profileA?.id) {
    const { data: chart, error: cErr } = await admin
      .from("fortune_charts")
      .insert({
        profile_id: profileA.id,
        engine_version: "1.0.0",
        calculation_hash: `phase51-${guestA.slice(0, 8)}`,
        chart_json: { engine: { version: "1.0.0" }, pillars: {} },
      })
      .select("id")
      .single();
    mark("fortune_chart insert", !cErr && !!chart?.id, cErr?.message);
    chartId = chart?.id ?? null;
  }

  let freeId = null;
  if (profileA?.id && chartId) {
    const { data: fr, error: fErr } = await admin
      .from("free_results")
      .insert({
        profile_id: profileA.id,
        fortune_chart_id: chartId,
        generation_status: "COMPLETED",
        result_json: { summary: "phase51 smoke" },
        generation_key: `phase51-key-${guestA}`,
        model: "smoke",
      })
      .select("id")
      .single();
    mark("free_result insert", !fErr && !!fr?.id, fErr?.message);
    freeId = fr?.id ?? null;
  }

  // 5) RLS: anon without auth should NOT see free_results (server-owned)
  if (freeId) {
    const { data: leak, error: leakErr } = await anon
      .from("free_results")
      .select("id")
      .eq("id", freeId);
    // Expected: empty or RLS deny — not the row
    const blocked = !leakErr && (leak?.length ?? 0) === 0;
    mark(
      "anon cannot read free_results by id",
      blocked || !!leakErr,
      leakErr?.message || `rows=${leak?.length ?? 0}`
    );
  }

  // 6) guest B must not own guest A profile via public client
  {
    const { data: foreign, error } = await anon
      .from("profiles")
      .select("id")
      .eq("guest_session_id", guestA);
    const blocked = !error && (foreign?.length ?? 0) === 0;
    mark(
      "anon cannot list guest A profile",
      blocked || !!error,
      error?.message || `rows=${foreign?.length ?? 0}`
    );
  }

  // cleanup
  if (freeId) await admin.from("free_results").delete().eq("id", freeId);
  if (chartId) await admin.from("fortune_charts").delete().eq("id", chartId);
  if (profileA?.id) await admin.from("profiles").delete().eq("id", profileA.id);

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\nRESULT: ${failed.length === 0 ? "DB/RLS SMOKE PASS" : `FAIL (${failed.length})`}`
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
