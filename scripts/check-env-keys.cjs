const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.log(".env.local: MISSING");
  process.exit(1);
}
const t = fs.readFileSync(envPath, "utf8");
const keys = [
  "GEMINI_API_KEY_PAID",
  "GEMINI_API_KEY_FREE",
  "GEMINI_API_KEY",
  "AI_PROVIDER",
  "AI_PROVIDER_FREE",
  "AI_PROVIDER_PAID",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];
for (const k of keys) {
  const m = t.match(new RegExp("^" + k + "=(.*)$", "m"));
  let v = m ? m[1].trim() : null;
  if (v && (v.startsWith('"') || v.startsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!v) {
    console.log(k + ": MISSING");
  } else if (/KEY|SECRET|TOKEN/i.test(k)) {
    console.log(k + ": SET(" + v.length + ")");
  } else {
    console.log(k + ": " + v);
  }
}
