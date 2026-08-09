import { NextResponse } from "next/server";
import { jarvisAgentRegistry } from "@/lib/jarvis/agent-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function riskFor(role: string) {
  if (/security|auditor|legal/i.test(role)) return "HIGH";
  if (/orchestrat|architect/i.test(role)) return "MEDIUM";
  return "LOW";
}

export async function GET() {
  const agents = jarvisAgentRegistry.listEnabled().map((agent) => ({
    id: agent.id,
    name: agent.name,
    department: agent.role.replace(/_/g, " "),
    status: "idle",
    riskLevel: riskFor(agent.role),
    tools: agent.allowedTools,
    capabilities: agent.capabilities,
    enabled: agent.enabled,
  }));
  return NextResponse.json({ ok: true, agents, fallbackUsed: false, message: "Активные агенты JARVIS загружены." });
}

export async function POST() {
  return NextResponse.json({ ok: false, message: "Создание агента выполняется через реестр JARVIS и требует настройки роли.", code: "REGISTRY_CONFIGURATION_REQUIRED" }, { status: 409 });
}
