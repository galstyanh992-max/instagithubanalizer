import { NextResponse } from "next/server";
import { runSafeAction } from "@/lib/safety";

export const runtime = "nodejs";

const FALLBACK_APPROVAL = {
  id: "fallback-approval-1",
  title: "Тестовое подтверждение опасного действия",
  description: "Это fallback-запрос для проверки confirmation gates.",
  riskLevel: "HIGH",
  status: "pending",
  requestedBy: "system",
  toolName: "terminal.exec",
  command: "npm run build"
};

export async function GET() {
  try {
    // Add dynamic createdAt so it doesn't break SSR if used, but here it's API so it's safe to use Date
    const fallbackWithDate = {
      ...FALLBACK_APPROVAL,
      createdAt: new Date().toISOString()
    };
    return NextResponse.json({
      ok: true,
      approvals: [fallbackWithDate],
      fallbackUsed: true,
      message: "Подтверждения загружены в fallback-режиме."
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Ошибка загрузки подтверждений" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Check safety
    if (body.action || body.toolName) {
      const safetyResult = await runSafeAction({
        action: body.action || "unknown",
        toolName: body.toolName,
        command: body.command
      });
      
      if (safetyResult.requiresApproval) {
        return NextResponse.json({
          ok: true,
          message: "Создан запрос на подтверждение (fallback)",
          approval: {
            id: `approval-${Date.now()}`,
            status: "pending",
            riskLevel: safetyResult.riskLevel,
            ...body
          }
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Действие разрешено",
      approval: null
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Ошибка обработки запроса" }, { status: 500 });
  }
}
