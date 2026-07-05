import { execSync } from "node:child_process";
try { execSync("npx vitest run src/lib/local-agent-runtime/local-agent-runtime.test.ts", { stdio: "inherit" }); console.log("\nLOCAL AGENT RUNTIME SMOKE: PASS"); }
catch { console.error("\nLOCAL AGENT RUNTIME SMOKE: FAIL"); process.exit(1); }
