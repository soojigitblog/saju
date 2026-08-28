/**
 * Append P6.1 pre-live flags to .env.local without overwriting existing keys.
 * node scripts/merge-p6-prelive-flags.cjs
 */
const fs = require("fs");
const path = ".env.local";
const existing = fs.readFileSync(path, "utf8");
const keys = new Set(
  existing
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=")[0].trim())
);

const append = [
  "",
  "# P6.1 pre-live flags (merged — does not overwrite existing keys)",
  ["PAID_CHECKOUT_ENABLED", "true"],
  ["PAID_REPORT_GENERATION_ENABLED", "false"],
  ["PAID_REPORT_LIVE_ENABLED", "false"],
  ["AI_PROVIDER_PAID", "gemini"],
  ["AI_PROVIDER_FREE", "gemini"],
  ["ALLOW_PAID_QA_CHECKOUT", "1"],
  ["ALLOW_TOSS_CHECKOUT", "1"],
  ["ALLOW_MOCK_AI", "1"],
  ["ADMIN_MANUAL_BYPASS", "1"],
  ["APP_ENV", "development"],
  ["ALLOW_INTERNAL_ADMIN_QA", "1"],
  // Strong local-only QA token — rotate for shared machines. Never commit real prod tokens.
  ["ADMIN_MANUAL_TOKEN", "p6-local-qa-admin-token-2026"],
  ["GEMINI_MODEL_PAID", "gemini-3.6-flash"],
  ["GEMINI_MODEL_FREE", "gemini-3.6-flash"],
  ["AI_FALLBACK_PROVIDER", ""],
].filter(([k]) => !keys.has(k));

if (append.length <= 2) {
  console.log("No new flags to merge.");
  process.exit(0);
}

fs.appendFileSync(
  path,
  append.map(([k, v]) => (v === "" ? `${k}=` : `${k}=${v}`)).join("\n") + "\n",
  "utf8"
);
console.log(`Merged ${append.length - 2} pre-live flag(s).`);
