/**
 * P5.2 pre-live deployment smoke — feature flag must stay false until manual enable.
 * Usage: node scripts/verify-prelive-env.cjs
 */
function flag(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : "";
}

const live = flag("PAID_REPORT_LIVE_ENABLED").toLowerCase();
const paidKey = flag("GEMINI_API_KEY_PAID");

console.log("## P5.2 Pre-Live Environment Smoke\n");
console.log(`PAID_REPORT_LIVE_ENABLED:\n${live || "(unset)"}\n`);
console.log(`GEMINI_API_KEY_PAID:\n${paidKey ? "CONFIGURED" : "MISSING/EMPTY"}\n`);

if (live === "true" || live === "1") {
  console.log(
    "RESULT: WARN — PAID_REPORT_LIVE_ENABLED is true. Customer paid generation is OPEN."
  );
  process.exit(0);
}

console.log("RESULT: PRE-LIVE OK — PAID_REPORT_LIVE_ENABLED is false/unset.");
console.log("Live enable requires manual PAID_REPORT_LIVE_ENABLED=true after acceptance.");
process.exit(0);
