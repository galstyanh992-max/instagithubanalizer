import { execSync } from "node:child_process";
// Phone UI Bridge smoke — pure behavior only (no execution, no live DB, no network).
// Covers: dashboard build, local command preview (local_agent_not_running),
// destructive command blocked, approvals inbox safe fallback, source strictness.
try {
  execSync("npx vitest run src/lib/phone-bridge/phone-bridge.test.ts", { stdio: "inherit" });
  console.log("\nPHONE BRIDGE SMOKE: PASS");
} catch {
  console.error("\nPHONE BRIDGE SMOKE: FAIL");
  process.exit(1);
}
