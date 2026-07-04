import { execSync } from "node:child_process";
try { execSync("npx vitest run src/lib/email-foundation/email-foundation.test.ts", { stdio: "inherit" }); console.log("\nEMAIL SMOKE: PASS"); }
catch { console.error("\nEMAIL SMOKE: FAIL"); process.exit(1); }
