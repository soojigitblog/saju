/**
 * PHASE 5.1 live environment probe.
 * Does NOT print secret values — only CONFIGURED / MISSING.
 *
 * Usage:
 *   node --env-file=.env.local scripts/verify-phase51-env.cjs
 *   # or with env already exported
 *   node scripts/verify-phase51-env.cjs
 *
 * After PHASE 4.1: AI may be gemini (preferred free tier) or openai.
 * Mock is never accepted for Live Gate.
 */

function status(name) {
  const v = process.env[name];
  return v && String(v).trim() ? "CONFIGURED" : "MISSING";
}

function provider() {
  const raw = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (raw === "gemini" || raw === "openai" || raw === "mock") return raw;
  // Dev default preference when unset (matches resolveAiProviderName)
  if (status("GEMINI_API_KEY") === "CONFIGURED") return "gemini";
  if (status("OPENAI_API_KEY") === "CONFIGURED") return "openai";
  return "unset";
}

const rows = [
  ["SUPABASE URL", "NEXT_PUBLIC_SUPABASE_URL"],
  ["PUBLISHABLE KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  ["SECRET KEY", "SUPABASE_SECRET_KEY"],
];

console.log("## PHASE 5.1 Environment Probe\n");

let missing = 0;
for (const [label, key] of rows) {
  const s = status(key);
  if (s === "MISSING") missing += 1;
  console.log(`${label}:\n${s}\n`);
}

const p = provider();
console.log(`AI_PROVIDER:\n${p === "unset" ? "UNSET (will fail Live Gate)" : p}\n`);

if (p === "mock") {
  console.log("RESULT: NOT READY — AI_PROVIDER=mock is forbidden for Live Gate.");
  process.exit(2);
}

if (p === "gemini" || p === "unset") {
  const geminiKey = status("GEMINI_API_KEY");
  const geminiModel = status("GEMINI_MODEL_FREE");
  console.log(`GEMINI KEY:\n${geminiKey}\n`);
  console.log(`GEMINI_MODEL_FREE:\n${geminiModel === "MISSING" ? "MISSING (default gemini-2.5-flash OK)" : geminiModel}\n`);
  if (geminiKey === "MISSING" && p === "gemini") missing += 1;
  if (p === "unset" && geminiKey === "MISSING" && status("OPENAI_API_KEY") === "MISSING") {
    missing += 1;
    console.log("OPENAI KEY:\nMISSING\n");
  }
}

if (p === "openai") {
  const openaiKey = status("OPENAI_API_KEY");
  const openaiModel = status("AI_MODEL_FREE");
  console.log(`OPENAI KEY:\n${openaiKey}\n`);
  console.log(`AI_MODEL_FREE:\n${openaiModel === "MISSING" ? "MISSING (default gpt-5.6-luna OK)" : openaiModel}\n`);
  if (openaiKey === "MISSING") missing += 1;
}

const fallback = (process.env.AI_FALLBACK_PROVIDER || "").trim();
console.log(`AI_FALLBACK_PROVIDER:\n${fallback ? "SET (Live Gate expects empty)" : "EMPTY (OK)"}\n`);
if (fallback) {
  console.log("RESULT: NOT READY — automatic paid fallback must stay disabled.");
  process.exit(2);
}

if (missing > 0) {
  console.log("RESULT: NOT READY — configure .env.local then re-run.");
  console.log("See docs/phase-5.1-live-verification.md and docs/setup-supabase.md");
  process.exit(2);
}

console.log("RESULT: ENV READY — next: apply migrations + live AI smoke + free fortune E2E");
process.exit(0);
