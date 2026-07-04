import { execSync } from "node:child_process";
try {
  execSync("npx vitest run src/lib/agent-factory/agent-factory.test.ts", { stdio: "inherit" });
  console.log("\nAGENT FACTORY SMOKE: PASS");
} catch {
  console.error("\nAGENT FACTORY SMOKE: FAIL");
  process.exit(1);
}
