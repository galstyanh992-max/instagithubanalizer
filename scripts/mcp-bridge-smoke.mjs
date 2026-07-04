import { execSync } from "node:child_process";
try { execSync("npx vitest run src/lib/mcp-bridge/mcp-bridge.test.ts", { stdio: "inherit" }); console.log("\nMCP BRIDGE SMOKE: PASS"); }
catch { console.error("\nMCP BRIDGE SMOKE: FAIL"); process.exit(1); }
