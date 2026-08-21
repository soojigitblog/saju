/**
 * Load .env.local then run PHASE T1.1 live QA vitest.
 * Usage: node scripts/run-phase-t11-live-qa.cjs
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

process.env.AI_PROVIDER = "gemini";
process.env.FREE_TAROT_LIMIT = process.env.FREE_TAROT_LIMIT_QA || "10";
process.env.FREE_TAROT_WINDOW_SECONDS =
  process.env.FREE_TAROT_WINDOW_SECONDS || "86400";

console.log("AI_PROVIDER:", process.env.AI_PROVIDER);
console.log(
  "GEMINI_API_KEY:",
  process.env.GEMINI_API_KEY ? "CONFIGURED" : "MISSING"
);
console.log("FREE_TAROT_LIMIT (QA run):", process.env.FREE_TAROT_LIMIT);
try {
  console.log(
    "Supabase URL host:",
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host
  );
} catch {
  console.log("Supabase URL host: INVALID");
}

const r = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/phase-t11-live-qa.test.ts"],
  { cwd: root, stdio: "inherit", env: process.env, shell: true }
);
process.exit(r.status ?? 1);
