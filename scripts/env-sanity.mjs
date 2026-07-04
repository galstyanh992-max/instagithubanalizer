import { existsSync, readFileSync } from "node:fs";

let fail = 0;
const bad = (m) => { console.error("FAIL:", m); fail++; };

if (!existsSync(".env.example")) { console.error("FAIL: .env.example missing"); process.exit(1); }
const env = readFileSync(".env.example", "utf8");

const CURRENT = ["DATABASE_URL", "DIRECT_URL", "JARWISYAN_AUTH_ENABLED", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
const FUTURE = ["OPENROUTER_API_KEY", "GLM_API_KEY", "GITHUB_TOKEN", "VERCEL_TOKEN", "TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USER_ID"];

for (const k of CURRENT) {
  if (!new RegExp(`^${k}=`, "m").test(env)) bad(`missing current-required placeholder: ${k}`);
  else console.log("ok (current):", k);
}
for (const k of FUTURE) {
  if (!new RegExp(`^${k}=`, "m").test(env)) console.log("WARN future-required (not blocker):", k, "absent");
  else console.log("ok (future):", k);
}

if (fail) { console.error(`\nENV SANITY: ${fail} issue(s)`); process.exit(1); }
console.log("\nENV SANITY: PASS");
