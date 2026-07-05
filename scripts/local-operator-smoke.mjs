import { execSync } from "node:child_process";
try { execSync("npx vitest run src/lib/local-operator/local-operator.test.ts", { stdio: "inherit" }); console.log("\nLOCAL OPERATOR SMOKE: PASS"); }
catch { console.error("\nLOCAL OPERATOR SMOKE: FAIL"); process.exit(1); }
