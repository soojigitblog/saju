/**
 * P5.2 paid-report environment smoke.
 * Checks the configured paid AI provider without printing credentials.
 * Usage: node scripts/verify-prelive-env.cjs
 */
function flag(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : "";
}

const live = flag("PAID_REPORT_LIVE_ENABLED").toLowerCase();
const provider = (flag("AI_PROVIDER_PAID") || flag("AI_PROVIDER")).toLowerCase();
const paidKeyName =
  provider === "gemini"
    ? "GEMINI_API_KEY_PAID"
    : provider === "openai"
      ? "OPENAI_API_KEY_PAID"
      : "";
const paidKey = paidKeyName ? flag(paidKeyName) : "";

console.log("## P5.2 Paid Report Environment Smoke\n");
console.log(`PAID_REPORT_LIVE_ENABLED:\n${live || "(unset)"}\n`);
console.log(`PAID_AI_PROVIDER:\n${provider || "MISSING/EMPTY"}\n`);
console.log(
  `PAID_AI_KEY (${paidKeyName || "unknown"}):\n${paidKey ? "CONFIGURED" : "MISSING/EMPTY"}\n`
);

if (live === "true" || live === "1") {
  if (!paidKeyName || !paidKey) {
    console.error("RESULT: FAIL — paid sales are open but the selected paid AI key is not configured.");
    process.exit(1);
  }
  console.log(
    "RESULT: PASS — customer paid report generation is OPEN with a configured paid AI provider."
  );
  process.exit(0);
}

console.log("RESULT: PRE-LIVE OK — PAID_REPORT_LIVE_ENABLED is false/unset.");
console.log("Live enable requires PAID_REPORT_LIVE_ENABLED=true and a provider-specific paid AI key.");
process.exit(0);
