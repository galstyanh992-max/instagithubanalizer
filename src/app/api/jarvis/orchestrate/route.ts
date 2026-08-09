import { NextResponse } from "next/server";
import { parseTask, executeTask, type JarvisTask } from "@/services/jarvis-orchestrator.service";
import { initProviders } from "@/lib/ai-provider/server";
import { db } from "@/lib/db";
import {
  assertAttachmentsSupported,
  getProviderCapabilityProfile,
} from "@/lib/chat/attachment-policy";
import { aiProviderRouter } from "@/services/ai-provider-router.service";

export const runtime = "nodejs";

/**
 * Jarvis orchestrator endpoint.
 * POST { "message": "сгенерируй изображение космического кота" }
 * Returns the parsed task + chat result, or instructions for media upload.
 */
export async function POST(req: Request) {
  try {
    await initProviders();
    const { message, preferredType, attachmentIds = [] } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!Array.isArray(attachmentIds) || attachmentIds.some((id) => typeof id !== "string") || attachmentIds.length > 5) {
      return NextResponse.json({ error: "invalid attachmentIds" }, { status: 400 });
    }
    const task = parseTask(message, preferredType as JarvisTask["type"] | undefined);
    if (attachmentIds.length > 0) {
      const attachments = await db.chatAttachment.findMany({
        where: { id: { in: attachmentIds }, ownerId: "web-user", status: "READY" },
      });
      if (attachments.length !== attachmentIds.length) {
        return NextResponse.json({ error: "attachment not found" }, { status: 404 });
      }
      const route = await aiProviderRouter.getProviderForIntent(task.intent);
      if (route.isMock) {
        return NextResponse.json({ error: "AUTH_REQUIRED: no real provider is configured" }, { status: 401 });
      }
      const metadata = attachments.map((attachment) => JSON.parse(attachment.metadata) as {
        category: "image" | "video" | "pdf" | "text";
        textPreview?: string;
      });
      try {
        assertAttachmentsSupported(
          getProviderCapabilityProfile(route.providerName),
          metadata.map((item) => item.category),
        );
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "attachment capability mismatch" }, { status: 422 });
      }
      const extracted = attachments.map((attachment, index) => {
        const item = metadata[index];
        return `Attachment: ${attachment.fileName}\n${item.textPreview ?? "[binary content not transported]"}`;
      }).join("\n\n");
      task.prompt = `${task.prompt}\n\n${extracted}`;
      task.provider = route.providerName;
    }
    const execution = await executeTask(task);

    return NextResponse.json({
      task,
      ...execution,
    });
  } catch (error) {
    console.error("[jarvis/orchestrate] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
