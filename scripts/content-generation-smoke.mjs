import { execSync } from "node:child_process";
try { execSync("npx vitest run src/lib/content-generation/content-generation.test.ts", { stdio: "inherit" }); console.log("\nCONTENT GENERATION SMOKE: PASS"); }
catch { console.error("\nCONTENT GENERATION SMOKE: FAIL"); process.exit(1); }
