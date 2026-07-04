import type { McpToolCapability } from "./types";
import type { RiskLevel } from "@/lib/safety/permission-checker";

export const CAPABILITY_RISK: Record<McpToolCapability, RiskLevel> = {
  filesystem_read: "MEDIUM",
  filesystem_write: "HIGH",
  terminal_command: "HIGH",
  browser_control: "MEDIUM",
  app_control: "HIGH",
  clipboard: "MEDIUM",
  screenshot: "MEDIUM",
  window_management: "MEDIUM",
  mcp_tool_call: "HIGH",
  unknown: "HIGH",
};

export function riskForCapability(cap: McpToolCapability): RiskLevel {
  return CAPABILITY_RISK[cap];
}
