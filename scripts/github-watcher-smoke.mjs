import { execSync } from "node:child_process";
try {
  execSync("npx vitest run src/lib/github-watcher/github-watcher.test.ts", { stdio: "inherit" });
  console.log("\nGITHUB WATCHER SMOKE: PASS");
} catch {
  console.error("\nGITHUB WATCHER SMOKE: FAIL");
  process.exit(1);
}
