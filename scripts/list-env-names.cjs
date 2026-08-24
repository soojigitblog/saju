const fs = require("fs");
const path = require("path");
const t = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const names = [];
for (const line of t.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=/);
  if (m) names.push(m[1]);
}
console.log(names.filter((n) => /SUPABASE|GEMINI|AI_|ALLOW_/.test(n)).join("\n"));
