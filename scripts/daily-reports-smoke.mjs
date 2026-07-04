import { execSync } from "node:child_process";
try {
  execSync("npx vitest run src/lib/daily-reports/daily-reports.test.ts", { stdio: "inherit" });
  console.log("\nDAILY REPORTS SMOKE: PASS");
} catch {
  console.error("\nDAILY REPORTS SMOKE: FAIL");
  process.exit(1);
}
