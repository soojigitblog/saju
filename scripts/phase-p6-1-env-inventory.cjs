/**
 * P6.1 ENV INVENTORY — SET/MISSING only, values never printed.
 * GEMINI_API_KEY_PAID absent = NOT_CONFIGURED_BY_POLICY (not an error).
 * node --env-file=.env.local scripts/phase-p6-1-env-inventory.cjs
 */
const { paidKeyStatus, paidGeminiActivationStatus } = require("./p6-cost-policy.cjs");

function st(name) {
  const v = process.env[name];
  return v && String(v).trim() ? "SET" : "MISSING";
}

const VARS = [
  // REQUIRED_FOR_INFRASTRUCTURE (P6.1 env recovery)
  ["NEXT_PUBLIC_SUPABASE_URL", "REQUIRED_FOR_INFRASTRUCTURE"],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "REQUIRED_FOR_INFRASTRUCTURE"],
  ["SUPABASE_SECRET_KEY", "REQUIRED_FOR_INFRASTRUCTURE"],
  ["AI_PROVIDER_PAID", "REQUIRED_FOR_INFRASTRUCTURE"],
  ["PAID_REPORT_LIVE_ENABLED", "REQUIRED_FOR_INFRASTRUCTURE"],
  // DEFERRED_BY_COST_POLICY — intentional until first paid customer
  ["GEMINI_API_KEY_PAID", "DEFERRED_BY_COST_POLICY"],
  // REQUIRED_FOR_PRODUCTION (not blocking infrastructure gate)
  ["AI_PROVIDER_FREE", "REQUIRED_FOR_PRODUCTION"],
  ["GEMINI_API_KEY_FREE", "REQUIRED_FOR_PRODUCTION"],
  ["GEMINI_MODEL_PAID", "REQUIRED_FOR_PRODUCTION"],
  ["GEMINI_MODEL_FREE", "REQUIRED_FOR_PRODUCTION"],
  ["BANK_TRANSFER_ACCOUNT_NUMBER", "REQUIRED_FOR_PRODUCTION"],
  ["TELEGRAM_BOT_TOKEN", "REQUIRED_FOR_PRODUCTION"],
  ["TELEGRAM_ADMIN_CHAT_ID", "REQUIRED_FOR_PRODUCTION"],
  // OPTIONAL
  ["AI_PROVIDER", "OPTIONAL"],
  ["GEMINI_API_KEY", "OPTIONAL"],
  ["OPENAI_API_KEY", "OPTIONAL"],
  ["AI_FALLBACK_PROVIDER", "OPTIONAL"],
  ["ALLOW_PAID_QA_CHECKOUT", "OPTIONAL"],
  ["ALLOW_TOSS_CHECKOUT", "OPTIONAL"],
  ["ALLOW_MOCK_AI", "OPTIONAL"],
  ["ADMIN_MANUAL_BYPASS", "OPTIONAL"],
  ["ADMIN_MANUAL_TOKEN", "OPTIONAL"],
  ["PAYMENT_PROVIDER", "OPTIONAL"],
  ["TOSS_SECRET_KEY", "OPTIONAL"],
  ["NEXT_PUBLIC_TOSS_CLIENT_KEY", "OPTIONAL"],
  ["APP_ENV", "OPTIONAL"],
  ["HANA_BANK_AUTOMATION_ENABLED", "OPTIONAL"],
  // NOT_USED (legacy docs only — code uses publishable+secret)
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NOT_USED"],
  ["SUPABASE_SERVICE_ROLE_KEY", "NOT_USED"],
];

console.log("## P6.1 ENV INVENTORY\n");

const tiers = [
  "REQUIRED_FOR_INFRASTRUCTURE",
  "DEFERRED_BY_COST_POLICY",
  "REQUIRED_FOR_PRODUCTION",
  "OPTIONAL",
  "NOT_USED",
];

let infraMissing = 0;
for (const tier of tiers) {
  console.log(`### ${tier}\n`);
  for (const [key, t] of VARS) {
    if (t !== tier) continue;
    let s;
    if (key === "GEMINI_API_KEY_PAID") {
      s = paidKeyStatus();
    } else {
      s = st(key);
    }
    if (tier === "REQUIRED_FOR_INFRASTRUCTURE" && s === "MISSING") infraMissing++;
    console.log(`${key.padEnd(40)} ${s}`);
  }
  console.log("");
}

const live = (process.env.PAID_REPORT_LIVE_ENABLED ?? "").trim().toLowerCase();
const fallback = (process.env.AI_FALLBACK_PROVIDER ?? "").trim();

console.log("### PAID KEY ISOLATION (no values)\n");
console.log(`GEMINI_API_KEY_PAID              ${paidKeyStatus()}`);
console.log(`GEMINI_API_KEY_FREE              ${st("GEMINI_API_KEY_FREE")}`);
console.log(`GEMINI_API_KEY (legacy)          ${st("GEMINI_API_KEY")}`);
console.log(`AI_FALLBACK_PROVIDER             ${fallback ? "SET (WARN)" : "EMPTY (OK)"}`);
console.log(`AI_PROVIDER_PAID                 ${process.env.AI_PROVIDER_PAID?.trim() || "MISSING"}`);

console.log("\n### FLAGS\n");
console.log(`PAID_REPORT_LIVE_ENABLED         ${live === "true" || live === "1" ? "TRUE (FAIL)" : "FALSE (OK)"}`);
console.log(`Supabase configured              ${st("NEXT_PUBLIC_SUPABASE_URL") === "SET" && st("SUPABASE_SECRET_KEY") === "SET" ? "YES" : "NO"}`);

console.log("\n### SUMMARY\n");
console.log(`Infrastructure required missing: ${infraMissing}`);
console.log(`Paid key: ${paidKeyStatus()}`);
console.log(`Paid Gemini activation: ${paidGeminiActivationStatus()}`);
console.log(`Real Supabase env: ${st("NEXT_PUBLIC_SUPABASE_URL") === "SET" ? "SET" : "MISSING"}`);

process.exit(infraMissing > 0 ? 2 : 0);
