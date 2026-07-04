import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

let fail = 0;
const bad = (m) => { console.error("FAIL:", m); fail++; };
const okmsg = (m) => console.log("ok:", m);

// 1. no suspicious tracked files
const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n");
const suspicious = tracked.filter((f) =>
  /(temp_|tool-results\/|\.db$)/i.test(f) ||
  /(^|\/)[^/]*(KEY|TOKEN|SECRET|PASSWORD)[^/]*\.(txt|env|json)$/i.test(f)
);
if (suspicious.length) bad("suspicious tracked files: " + suspicious.join(", "));
else okmsg("no suspicious tracked files");

// 2. .env.example exists
if (!existsSync(".env.example")) bad(".env.example missing");
else okmsg(".env.example exists");

// 3. .env.example has no real secret-like values
if (existsSync(".env.example")) {
  const env = readFileSync(".env.example", "utf8");
  const leaks = env.split("\n").filter((l) =>
    /=\s*"(sk-[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,})/.test(l)
  );
  if (leaks.length) bad(".env.example contains real-looking secret");
  else okmsg(".env.example has no real secret values");
}

// 4. real env files not tracked
const trackedEnv = tracked.filter((f) => /^\.env($|\.local|\..*\.local)/.test(f));
if (trackedEnv.length) bad("real env tracked: " + trackedEnv.join(", "));
else okmsg("real .env files not tracked");

// 5. .gitignore protections
const gi = existsSync(".gitignore") ? readFileSync(".gitignore", "utf8") : "";
for (const p of [".env", "*.db", "/tool-results/"]) {
  if (!gi.includes(p)) bad(`.gitignore missing protection: ${p}`);
}
if (gi.includes("!.env.example")) okmsg(".gitignore allows .env.example");
else bad(".gitignore does not allow .env.example");

// 6. no ignoreBuildErrors
const nc = existsSync("next.config.ts") ? readFileSync("next.config.ts", "utf8") : "";
if (/ignoreBuildErrors:\s*true/.test(nc)) bad("next.config.ts has ignoreBuildErrors: true");
else okmsg("no ignoreBuildErrors");

// 7. auth not disabled-by-default in prod
const mw = existsSync("src/middleware.ts") ? readFileSync("src/middleware.ts", "utf8") : "";
if (/IS_PROD\s*\?\s*RAW\s*!==\s*"false"/.test(mw)) okmsg("prod auth fails closed");
else bad("production auth policy not fail-closed");

if (fail) { console.error(`\nSECURITY SMOKE: ${fail} issue(s)`); process.exit(1); }
console.log("\nSECURITY SMOKE: PASS");
