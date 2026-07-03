import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FALLBACK_AGENTS = [
  {
    id: "orchestrator",
    name: "Orchestrator",
    department: "orchestration",
    status: "idle",
    riskLevel: "MEDIUM",
    tools: ["workflow", "memory", "approval"],
    enabled: true
  },
  {
    id: "frontend-engineer",
    name: "Frontend Engineer",
    department: "coding",
    status: "idle",
    riskLevel: "LOW",
    tools: ["code-review", "ui-check"],
    enabled: true
  },
  {
    id: "security-auditor",
    name: "Security Auditor",
    department: "security",
    status: "idle",
    riskLevel: "HIGH",
    tools: ["secret-scan", "safety-validator"],
    enabled: true
  }
];

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      agents: FALLBACK_AGENTS,
      fallbackUsed: true,
      message: "Агенты загружены в fallback-режиме."
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Ошибка загрузки агентов" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ ok: false, message: "Имя агента обязательно" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      message: "Агент создан (fallback)",
      agent: { id: "new-agent", ...body }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Ошибка обработки запроса" }, { status: 500 });
  }
}
