import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { extractTextFromImage } from "@/services/ocr.service";
import { extractCandidatesFromText } from "@/services/github.service";
import { downloadFromStorage, parseStorageUrl } from "@/lib/supabase-server";
import { env } from "@/lib/env";

export const POST = safe(async (req: Request) => {
  const { screenshotId } = await parseJson<{ screenshotId?: string }>(req);
  if (!screenshotId) return err("screenshotId required", 400);

  const screenshot = await db.screenshot.findUnique({ where: { id: screenshotId } });
  if (!screenshot) return err("Screenshot not found", 404);

  // Read file from Supabase Storage instead of local disk
  let ocrResult;
  try {
    const parsed = parseStorageUrl(screenshot.filePath);
    const buffer = parsed
      ? await downloadFromStorage(parsed.key, parsed.bucket)
      : await downloadFromStorage(screenshot.filePath, env.SUPABASE_STORAGE_BUCKET);
    ocrResult = await extractTextFromImage(buffer, screenshot.mimeType);
  } catch (e) {
    ocrResult = {
      text: "",
      confidence: 0,
      mock: true,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // Extract candidates
  const candidates = extractCandidatesFromText(ocrResult.text);
  const needsManualReview = candidates.length === 0 || ocrResult.confidence < 0.7;

  // Update screenshot
  await db.screenshot.update({
    where: { id: screenshot.id },
    data: {
      extractedText: ocrResult.text,
      confidenceAverage: ocrResult.confidence,
      needsManualReview,
    },
  });

  // Save candidates
  if (candidates.length > 0) {
    await db.extractedCandidate.createMany({
      data: candidates.map((c) => ({
        screenshotId: screenshot.id,
        rawText: c.rawText,
        candidateName: c.candidateName,
        resolvedGithubUrl: c.resolvedGithubUrl,
        owner: c.owner,
        repo: c.repo,
        confidenceScore: c.confidenceScore,
        needsManualReview: c.confidenceScore < 0.7,
        status: "resolved",
      })),
    });
  }

  return ok({
    screenshotId: screenshot.id,
    extractedText: ocrResult.text,
    confidence: ocrResult.confidence,
    mock: ocrResult.mock,
    needsManualReview,
    candidates,
  });
});
