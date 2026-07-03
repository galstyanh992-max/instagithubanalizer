import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FALLBACK_WORKFLOWS = [
  {
    id: "repo-analysis-flow",
    name: "Анализ репозитория",
    status: "idle",
    progress: 0,
    steps: ["Проверка README", "Risk Gate", "Integration Plan", "Report"]
  },
  {
    id: "safe-deploy-flow",
    name: "Безопасный деплой",
    status: "waiting_approval",
    progress: 40,
    steps: ["Build", "Secret Scan", "Approval", "Deploy"]
  }
];

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      workflows: FALLBACK_WORKFLOWS,
      fallbackUsed: true,
      message: "Процессы загружены в fallback-режиме."
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Ошибка загрузки процессов" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({
      ok: true,
      message: "Процесс запущен (fallback)",
      workflow: { id: "new-workflow", ...body }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Ошибка обработки запроса" }, { status: 500 });
  }
}
