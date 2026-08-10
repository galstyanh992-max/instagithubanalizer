import { ok, err, safe, parseJson } from "@/lib/api";
import { env } from "@/lib/env";
import path from "path";
import { z } from "zod";

const schema = z.object({
  targetPath: z.string().min(1).optional().default(process.cwd()),
});

export const POST = safe(async (req: Request) => {
  if (env.JARVIS_RUNTIME_ROLE === "web-control-plane") {
    return err("Opening the local file manager runs on the local JARVIS runtime only.", 501);
  }
  const body = await parseJson(req).catch(() => ({}));
  const parsed = schema.safeParse(body);
  const targetPath = parsed.success ? parsed.data.targetPath : process.cwd();

  try {
    const resolved = path.resolve(targetPath);
    const { openFileManager } = await import("@/local-runtime/api-helpers/open-file-manager");
    await openFileManager(resolved);
    return ok({ message: "File manager opened", path: resolved });
  } catch (e: any) {
    return err(`Failed to open file manager: ${e.message}`, 500);
  }
});
