/** Verify migration 0021 columns exist. */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("NO_KEY");
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const ag = await admin
    .from("ai_generations")
    .select("id, latency_ms, estimated_ai_cost_usd")
    .limit(1);
  const rp = await admin
    .from("reports")
    .select("id, estimated_ai_cost_usd")
    .limit(1);

  console.log(
    JSON.stringify(
      {
        ai_generations: { ok: !ag.error, error: ag.error?.message ?? null },
        reports: { ok: !rp.error, error: rp.error?.message ?? null },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
