import { execSync } from "node:child_process";

try {
  execSync("npx vitest run src/lib/developer-operator/developer-operator.test.ts", { stdio: "inherit" });
  console.log("\nDEVELOPER OPERATOR SMOKE: PASS");
} catch {
  console.error("\nDEVELOPER OPERATOR SMOKE: FAIL");
  process.exit(1);
}
