import { ok, err, safe, parseJson } from "@/lib/api";
import { voiceCommandSchema } from "@/lib/validators";
import { voiceService } from "@/services/voice.service";

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = voiceCommandSchema.safeParse(body);
  if (!parsed.success) {
    return err("transcript required", 400, { issues: parsed.error.flatten() });
  }
  const result = await voiceService.handleCommand(parsed.data.transcript);
  return ok(result);
});
