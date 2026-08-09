import { ok, err, safe, parseJson } from "@/lib/api";
import { chatService } from "@/services/chat.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { detectPromptInjection, runSafeAction } from "@/lib/safety";
import { initProviders } from "@/lib/ai-provider/server";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  projectId: z.string().optional(),
  repoId: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).optional(),
});

export const POST = safe(async (req: Request) => {
  await initProviders();

  // Rate limit
  const rl = checkRateLimit(req);
  if (!rl.allowed) {
    return err("Слишком много запросов. Попробуйте позже.", 429);
  }

  const body = await parseJson(req);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid chat input", 400, { issues: parsed.error.flatten() });
  }

  const injectionCheck = detectPromptInjection(parsed.data.message);
  if (injectionCheck.detected && (injectionCheck.riskLevel === "HIGH" || injectionCheck.riskLevel === "CRITICAL")) {
    return err("Обнаружена попытка prompt injection. Запрос заблокирован системой безопасности.", 403, { riskLevel: injectionCheck.riskLevel });
  }

  const safeAction = await runSafeAction({
    action: "chat.message",
    payload: parsed.data.message,
    actor: { id: "web-user", role: "owner", source: "web" }
  });

  if (safeAction.blocked) {
    return err(safeAction.message, 403);
  }

  const result = await chatService.handle({
    ...parsed.data,
    message: injectionCheck.sanitizedPrompt
  });
  return ok(result);
});
