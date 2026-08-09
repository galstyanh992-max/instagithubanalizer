import { ok, err, safe, parseJson } from "@/lib/api";
import { spawn } from "child_process";
import path from "path";
import { z } from "zod";

const schema = z.object({
  targetPath: z.string().min(1).optional().default(process.cwd()),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req).catch(() => ({}));
  const parsed = schema.safeParse(body);
  const targetPath = parsed.success ? parsed.data.targetPath : process.cwd();

  try {
    const resolved = path.resolve(targetPath);
    await new Promise<void>((resolve, reject) => {
      const explorer = spawn("explorer.exe", [resolved], {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
      explorer.once("error", reject);
      explorer.once("spawn", () => {
        explorer.unref();
        resolve();
      });
    });
    return ok({ message: "File manager opened", path: resolved });
  } catch (e: any) {
    return err(`Failed to open file manager: ${e.message}`, 500);
  }
});
