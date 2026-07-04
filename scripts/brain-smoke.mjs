import { execSync } from "node:child_process";

try {
  execSync("npx vitest run src/lib/project-brain/project-brain-service.test.ts", { stdio: "inherit" });
  console.log("\nBRAIN SMOKE: PASS");
} catch {
  console.error("\nBRAIN SMOKE: FAIL");
  process.exit(1);
}
