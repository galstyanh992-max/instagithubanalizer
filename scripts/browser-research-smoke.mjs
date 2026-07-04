import { execSync } from "node:child_process";
try { execSync("npx vitest run src/lib/browser-research/browser-research.test.ts", { stdio: "inherit" }); console.log("\nBROWSER RESEARCH SMOKE: PASS"); }
catch { console.error("\nBROWSER RESEARCH SMOKE: FAIL"); process.exit(1); }
