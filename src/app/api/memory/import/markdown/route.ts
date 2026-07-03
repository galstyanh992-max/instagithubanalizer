import { ok, err, safe, parseJson } from "@/lib/api";
import { memoryService } from "@/services/memory/memory.service";
import { memorySafetyService } from "@/services/memory/memory-safety.service";
import { z } from "zod";

const importSchema = z.object({
  markdownFiles: z.array(z.object({
    filename: z.string(),
    content: z.string(),
  })),
  projectId: z.string().optional(),
  source: z.string().default("import"),
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid import input", 400, { issues: parsed.error.flatten() });
  }

  const created: unknown[] = [];
  for (const file of parsed.data.markdownFiles) {
    // Safety check — не импортируем файлы с секретами
    const safety = memorySafetyService.checkMemory(file.content);
    if (!safety.safe) {
      continue; // пропускаем файлы с секретами
    }

    // Извлекаем заголовок из первой строки markdown
    const titleMatch = file.content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : file.filename.replace(/\.md$/i, "");

    const record = await memoryService.create({
      kind: "external_doc",
      title,
      content: file.content,
      source: parsed.data.source,
      projectId: parsed.data.projectId,
      tags: ["imported", "markdown"],
    });
    created.push(record);
  }

  return ok({ imported: created.length, records: created });
});
