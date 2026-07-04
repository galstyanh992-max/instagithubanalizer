import { describe, it, expect } from "vitest";
import { checkPermission } from "./permission-checker";
import { analyzeTerminalCommand } from "./terminal-guard";
import type { SafetyActor } from "./actor";

const owner: SafetyActor = { id: "u1", role: "owner", source: "web" };
const viewer: SafetyActor = { id: "u2", role: "viewer", source: "web" };
const agentNoPerm: SafetyActor = { id: "a1", role: "agent", source: "agent" };
const agentPerm: SafetyActor = { id: "a2", role: "agent", source: "agent", hasToolPermission: true };

const ROOT = "/tmp/agent-workspace";

describe("permission-checker (actor-aware)", () => {
  it("unknown actor cannot execute LOW action", () => {
    const r = checkPermission({ action: "filesystem.write", riskLevel: "LOW", actor: undefined });
    expect(r.allowed).toBe(false);
    expect(r.requiresApproval).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it("viewer cannot execute write/risky action", () => {
    const r = checkPermission({ action: "filesystem.write", riskLevel: "LOW", actor: viewer });
    expect(r.allowed).toBe(false);
  });

  it("viewer can read (read-only LOW)", () => {
    const r = checkPermission({ action: "filesystem.read", riskLevel: "LOW", actor: viewer });
    expect(r.allowed).toBe(true);
  });

  it("agent without tool permission denied at LOW", () => {
    const r = checkPermission({ action: "filesystem.write", riskLevel: "LOW", actor: agentNoPerm });
    expect(r.allowed).toBe(false);
  });

  it("agent with tool permission allowed at LOW", () => {
    const r = checkPermission({ action: "filesystem.write", riskLevel: "LOW", actor: agentPerm });
    expect(r.allowed).toBe(true);
  });

  it("agent requires approval for MEDIUM and HIGH", () => {
    expect(checkPermission({ action: "x", riskLevel: "MEDIUM", actor: agentPerm }).requiresApproval).toBe(true);
    expect(checkPermission({ action: "x", riskLevel: "HIGH", actor: agentPerm }).requiresApproval).toBe(true);
  });

  it("owner triggers approval flow for HIGH", () => {
    const r = checkPermission({ action: "git.push", riskLevel: "HIGH", actor: owner });
    expect(r.allowed).toBe(false);
    expect(r.requiresApproval).toBe(true);
  });

  it("CRITICAL requires explicit owner approval; agent denied", () => {
    expect(checkPermission({ action: "x", riskLevel: "CRITICAL", actor: owner }).requiresApproval).toBe(true);
    expect(checkPermission({ action: "x", riskLevel: "CRITICAL", actor: agentPerm }).allowed).toBe(false);
    expect(checkPermission({ action: "x", riskLevel: "CRITICAL", actor: agentPerm }).requiresApproval).toBe(false);
  });

  it("result always includes reason + riskLevel", () => {
    const r = checkPermission({ action: "x", riskLevel: "MEDIUM", actor: owner });
    expect(r.reason).toBeTruthy();
    expect(r.riskLevel).toBe("MEDIUM");
  });
});

describe("terminal-guard", () => {
  it("fails closed when workspace root unset", () => {
    const r = analyzeTerminalCommand("ls", { workspaceRoot: "" });
    expect(r.allowed).toBe(false);
    expect(r.riskLevel).toBe("CRITICAL");
  });

  it("denies destructive command (rm -rf /)", () => {
    const r = analyzeTerminalCommand("rm -rf /", { workspaceRoot: ROOT });
    expect(r.allowed).toBe(false);
    expect(r.requiresApproval).toBe(false);
    expect(r.riskLevel).toBe("CRITICAL");
  });

  it("denies sudo and fork bomb", () => {
    expect(analyzeTerminalCommand("sudo rm x", { workspaceRoot: ROOT }).allowed).toBe(false);
    expect(analyzeTerminalCommand(":(){ :|:& };:", { workspaceRoot: ROOT }).allowed).toBe(false);
  });

  it("blocks path traversal outside workspace", () => {
    const r = analyzeTerminalCommand("cat ../../etc/passwd", { workspaceRoot: ROOT });
    expect(r.allowed).toBe(false);
    expect(r.riskLevel).toBe("CRITICAL");
  });

  it("requires approval for .env access", () => {
    const r = analyzeTerminalCommand("cat .env", { workspaceRoot: ROOT });
    expect(r.requiresApproval).toBe(true);
  });

  it("requires approval for git push", () => {
    const r = analyzeTerminalCommand("git push origin main", { workspaceRoot: ROOT });
    expect(r.requiresApproval).toBe(true);
  });

  it("allows known-safe command (npm test)", () => {
    const r = analyzeTerminalCommand("npm test", { workspaceRoot: ROOT });
    expect(r.allowed).toBe(true);
    expect(r.riskLevel).toBe("LOW");
  });

  it("unknown command requires approval (fail safe)", () => {
    const r = analyzeTerminalCommand("somerandombinary --do-stuff", { workspaceRoot: ROOT });
    expect(r.requiresApproval).toBe(true);
  });
});
