import { execSync } from "node:child_process";
try {
  execSync("npx vitest run src/lib/api-hub/api-hub.test.ts", { stdio: "inherit" });
  console.log("\nAPI HUB SMOKE: PASS");
} catch {
  console.error("\nAPI HUB SMOKE: FAIL");
  process.exit(1);
}
