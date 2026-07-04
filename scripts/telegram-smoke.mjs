import { execSync } from "node:child_process";
try {
  execSync("npx vitest run src/lib/telegram/telegram.test.ts", { stdio: "inherit" });
  console.log("\nTELEGRAM SMOKE: PASS");
} catch {
  console.error("\nTELEGRAM SMOKE: FAIL");
  process.exit(1);
}
