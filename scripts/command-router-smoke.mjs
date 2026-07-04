// Command-router smoke: reuses vitest to run pure router scenarios headlessly.
// No new dependency (vitest already present). Honest exit code.
import { execSync } from "node:child_process";

try {
  execSync("npx vitest run src/lib/command-router/router.test.ts", { stdio: "inherit" });
  console.log("\nCOMMAND ROUTER SMOKE: PASS");
} catch {
  console.error("\nCOMMAND ROUTER SMOKE: FAIL");
  process.exit(1);
}
