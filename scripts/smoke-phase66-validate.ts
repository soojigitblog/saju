/**
 * PHASE 6.6 validation probes (no secrets printed).
 * Usage: npx tsx --require ./scripts/shim-server-only.cjs scripts/smoke-phase66-validate.ts
 */
import {
  getAiFallbackProvider,
  getGeminiApiKeyForTier,
  resolveAiProviderForFree,
  resolveAiProviderForPaid,
} from "@/lib/ai/config";
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

const ORDER_ID = "9b74f6c9-626a-4220-98bd-619ccafd4e9e";

async function main() {
  const freeKey = getGeminiApiKeyForTier("free");
  const paidKey = getGeminiApiKeyForTier("paid");
  const freeOnly = process.env.GEMINI_API_KEY_FREE?.trim();
  const paidOnly = process.env.GEMINI_API_KEY_PAID?.trim();

  console.log(
    JSON.stringify(
      {
        providers: {
          free: resolveAiProviderForFree(),
          paid: resolveAiProviderForPaid(),
        },
        keys: {
          freeConfigured: Boolean(freeKey),
          paidConfigured: Boolean(paidKey),
          freeTierEnvSet: Boolean(freeOnly),
          paidTierEnvSet: Boolean(paidOnly),
          sameKeyFallback: Boolean(freeKey && paidKey && freeKey === paidKey),
        },
        fallback: getAiFallbackProvider(),
        fallbackEnv: process.env.AI_FALLBACK_PROVIDER ?? "",
      },
      null,
      2
    )
  );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("NO_KEY");
  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: order } = await admin
    .from("orders")
    .select("id, order_no, status, paid_at, guest_session_id, amount")
    .eq("id", ORDER_ID)
    .single();

  const { count: paymentCount } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", ORDER_ID);

  const { data: reports } = await admin
    .from("reports")
    .select(
      "id, generation_status, error_code, error_message, input_tokens, output_tokens, total_tokens, estimated_ai_cost_usd, attempt_count"
    )
    .eq("order_id", ORDER_ID);

  const { data: gens } = await admin
    .from("ai_generations")
    .select(
      "id, generation_key, status, error_code, error_message, attempt_count, input_tokens, estimated_ai_cost_usd, result_type"
    )
    .eq("order_id", ORDER_ID)
    .eq("result_type", "paid");

  // unique logical keys (strip attempt suffix if any)
  const logicalKeys = new Set(
    (gens ?? []).map((g) => g.generation_key.replace(/:attempt:\d+$/, ""))
  );

  console.log(
    JSON.stringify(
      {
        order,
        paymentCount,
        reportCount: reports?.length ?? 0,
        reports,
        aiGenerationCount: gens?.length ?? 0,
        logicalGenerationCount: logicalKeys.size,
        ai_generations: gens,
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
