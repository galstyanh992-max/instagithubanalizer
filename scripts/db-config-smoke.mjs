import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

let fail = 0;
const bad = (m) => { console.error("FAIL:", m); fail++; };
const okmsg = (m) => console.log("ok:", m);

// prisma schema validity (dummy non-secret placeholders, no live DB)
try {
  execSync('DATABASE_URL="postgresql://u:p@localhost:5432/db" DIRECT_URL="postgresql://u:p@localhost:5432/db" npx prisma validate', { stdio: "pipe" });
  okmsg("prisma schema valid");
} catch {
  bad("prisma schema invalid");
}

// .env.example required placeholders
const env = existsSync(".env.example") ? readFileSync(".env.example", "utf8") : "";
for (const k of ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  if (new RegExp(`^${k}=`, "m").test(env)) okmsg(`.env.example has ${k}`);
  else bad(`.env.example missing ${k}`);
}

// placeholders must not look like real secrets
if (/=\s*"(sk-|ghp_|eyJ[A-Za-z0-9_-]{15,}\.)/.test(env)) bad(".env.example contains real-looking secret");
else okmsg(".env.example placeholders are safe");

// process env DATABASE_URL presence — booleans only, never print value
const dbConfigured = Boolean(process.env.DATABASE_URL && !/USER:PASSWORD@HOST/.test(process.env.DATABASE_URL));
console.log(`ok: live DATABASE_URL configured = ${dbConfigured} (value never printed)`);
if (!dbConfigured) console.log("NOT RUN: live DB checks skipped (DATABASE_URL not configured).");

if (fail) { console.error(`\nDB CONFIG SMOKE: ${fail} issue(s)`); process.exit(1); }
console.log("\nDB CONFIG SMOKE: PASS");
