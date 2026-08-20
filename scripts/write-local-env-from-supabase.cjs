/**
 * Write .env.local from `supabase status -o env` (local stack).
 * Does not print secret values.
 *
 * Usage (with Docker + `supabase start` already running):
 *   node scripts/write-local-env-from-supabase.cjs
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outPath = path.join(root, ".env.local");

let raw;
try {
  raw = execSync("npx supabase status -o env", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  console.error("Failed to read supabase status. Is `npx supabase start` running?");
  process.exit(1);
}

const map = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  map[m[1]] = m[2].replace(/^"|"$/g, "");
}

const apiUrl = map.API_URL || map.SUPABASE_URL;
// Prefer JWT service_role for local admin (bypasses RLS). New sb_secret_* may
// not carry table grants the same way on all CLI versions.
const publishable =
  map.PUBLISHABLE_KEY ||
  map.ANON_KEY ||
  map.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret =
  map.SERVICE_ROLE_KEY ||
  map.SECRET_KEY ||
  map.SUPABASE_SECRET_KEY;


if (!apiUrl || !publishable || !secret) {
  console.error("Missing API_URL / PUBLISHABLE_KEY / SECRET_KEY from supabase status.");
  process.exit(1);
}

const contents = `# Auto-generated from local supabase status — DO NOT COMMIT
NEXT_PUBLIC_SUPABASE_URL=${apiUrl}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishable}
SUPABASE_SECRET_KEY=${secret}

# AI — paste GEMINI_API_KEY to unlock Live Gate (PHASE 5.1)
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL_FREE=gemini-2.5-flash
GEMINI_MODEL_PAID=gemini-2.5-flash

OPENAI_API_KEY=
AI_MODEL_FREE=gpt-5.6-luna
AI_MODEL_PAID=gpt-5.6-terra
AI_FALLBACK_PROVIDER=

AI_TIMEOUT_MS=60000
AI_MAX_RETRIES=2
FREE_FORTUNE_LIMIT=5
FREE_FORTUNE_WINDOW_SECONDS=3600
`;

fs.writeFileSync(outPath, contents, "utf8");
console.log("Wrote .env.local (secrets not printed).");
console.log("NEXT: set GEMINI_API_KEY in .env.local, then:");
console.log("  node --env-file=.env.local scripts/verify-phase51-env.cjs");
