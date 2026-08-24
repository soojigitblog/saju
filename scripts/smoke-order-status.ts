/** Query smoke order state without server-only imports. */
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const orderId = "9b74f6c9-626a-4220-98bd-619ccafd4e9e";

async function main() {
  if (!key) {
    console.log(JSON.stringify({ ok: false, error: "NO_SUPABASE_KEY" }));
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: order } = await admin
    .from("orders")
    .select("order_no, status, paid_at, amount, product_name_snapshot")
    .eq("id", orderId)
    .maybeSingle();

  const { data: report } = await admin
    .from("reports")
    .select("generation_status, error_code, input_tokens, estimated_ai_cost_usd")
    .eq("order_id", orderId)
    .maybeSingle();

  const { data: payments } = await admin
    .from("payments")
    .select("id")
    .eq("order_id", orderId);

  const { data: gens } = await admin
    .from("ai_generations")
    .select("status, error_code, total_tokens, estimated_ai_cost_usd, result_type")
    .eq("order_id", orderId);

  console.log(
    JSON.stringify(
      {
        order,
        report,
        payments: payments?.length ?? 0,
        ai_generations: gens?.length ?? 0,
        ai_generation_rows: gens,
      },
      null,
      2
    )
  );
}

main().catch(console.error);
