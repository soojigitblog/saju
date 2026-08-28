/**
 * P6 ENV INVENTORY — SET / MISSING / OPTIONAL only (no secret values).
 * node --env-file=.env.local scripts/phase-p6-env-inventory.cjs
 */
function st(name) {
  const v = process.env[name];
  return v && String(v).trim() ? "SET" : "MISSING";
}

function opt(name) {
  const v = process.env[name];
  return v && String(v).trim() ? "SET" : "OPTIONAL";
}

const REQUIRED = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase URL (public)"],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "Supabase publishable key"],
  ["SUPABASE_SECRET_KEY", "Supabase secret key (server)"],
  ["GEMINI_API_KEY_PAID", "Paid Gemini key (no free fallback)"],
  ["AI_PROVIDER_PAID", "Paid AI provider (gemini expected)"],
];

const IMPORTANT = [
  ["PAID_REPORT_LIVE_ENABLED", "Customer sales gate (must be false pre-live)"],
  ["AI_PROVIDER_FREE", "Free tier provider"],
  ["GEMINI_API_KEY_FREE", "Free Gemini key"],
  ["GEMINI_MODEL_PAID", "Paid Gemini model"],
  ["GEMINI_MODEL_FREE", "Free Gemini model"],
  ["APP_ENV", "App environment"],
];

const OPTIONAL = [
  ["AI_PROVIDER", "Legacy default provider"],
  ["GEMINI_API_KEY", "Legacy Gemini key (free only fallback)"],
  ["OPENAI_API_KEY", "OpenAI key"],
  ["AI_FALLBACK_PROVIDER", "Must stay empty for paid isolation"],
  ["ALLOW_PAID_QA_CHECKOUT", "Internal QA checkout"],
  ["ALLOW_TOSS_CHECKOUT", "Toss test checkout"],
  ["ALLOW_MOCK_AI", "Mock AI in dev"],
  ["ADMIN_MANUAL_BYPASS", "Admin manual token bypass (dev/test)"],
  ["ADMIN_MANUAL_TOKEN", "Admin manual token"],
  ["PAYMENT_PROVIDER", "Payment provider"],
  ["TOSS_SECRET_KEY", "Toss secret"],
  ["NEXT_PUBLIC_TOSS_CLIENT_KEY", "Toss client key"],
  ["BANK_TRANSFER_ACCOUNT_NUMBER", "Bank transfer account"],
  ["TELEGRAM_BOT_TOKEN", "Telegram alerts"],
  ["TELEGRAM_ADMIN_CHAT_ID", "Telegram chat id"],
  ["HANA_BANK_AUTOMATION_ENABLED", "Hana automation"],
];

console.log("## P6 ENV INVENTORY\n");

let requiredMissing = 0;
console.log("### REQUIRED\n");
for (const [key, label] of REQUIRED) {
  const s = st(key);
  if (s === "MISSING") requiredMissing++;
  console.log(`${key} (${label}): ${s}`);
}

console.log("\n### IMPORTANT\n");
for (const [key, label] of IMPORTANT) {
  console.log(`${key} (${label}): ${st(key)}`);
}

const live = (process.env.PAID_REPORT_LIVE_ENABLED ?? "").trim().toLowerCase();
console.log(
  `\nPAID_REPORT_LIVE_ENABLED effective: ${live === "true" || live === "1" ? "TRUE (WARN)" : "FALSE (OK)"}`
);

console.log("\n### OPTIONAL\n");
for (const [key] of OPTIONAL) {
  console.log(`${key}: ${opt(key)}`);
}

const paidKey = st("GEMINI_API_KEY_PAID");
const freeKey = st("GEMINI_API_KEY_FREE");
const legacyKey = st("GEMINI_API_KEY");
const fallback = (process.env.AI_FALLBACK_PROVIDER ?? "").trim();

console.log("\n### PAID KEY ISOLATION\n");
console.log(`GEMINI_API_KEY_PAID: ${paidKey}`);
console.log(`GEMINI_API_KEY_FREE (must not substitute paid): ${freeKey}`);
console.log(`GEMINI_API_KEY legacy (must not substitute paid): ${legacyKey}`);
console.log(`AI_FALLBACK_PROVIDER: ${fallback ? "SET (WARN)" : "EMPTY (OK)"}`);

console.log("\n### SUMMARY\n");
console.log(`Required missing: ${requiredMissing}`);
console.log(`Paid key: ${paidKey === "SET" ? "CONFIGURED" : "MISSING"}`);
console.log(`Customer sales flag: ${live === "true" || live === "1" ? "TRUE" : "FALSE"}`);

process.exit(requiredMissing > 0 || paidKey === "MISSING" ? 2 : 0);
