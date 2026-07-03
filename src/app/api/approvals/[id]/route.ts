import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/safety";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    if (body.action === "approve") {
      recordAuditEvent({
        type: "approval.approved",
        message: `Подтверждение ${id} одобрено пользователем.`,
        actor: "user"
      });
      return NextResponse.json({
        ok: true,
        message: "Запрос подтверждения одобрен (fallback).",
        approval: { id, status: "approved" }
      });
    } else if (body.action === "reject") {
      recordAuditEvent({
        type: "approval.rejected",
        message: `Подтверждение ${id} отклонено пользователем.`,
        actor: "user"
      });
      return NextResponse.json({
        ok: true,
        message: "Запрос подтверждения отклонён (fallback).",
        approval: { id, status: "rejected" }
      });
    }

    return NextResponse.json({ ok: false, message: "Неизвестное действие." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Ошибка обработки запроса" }, { status: 500 });
  }
}
