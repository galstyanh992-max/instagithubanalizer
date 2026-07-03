// AI Jarwisyan — OCR service (server-side, tesseract.js with safe fallback)

import { env } from "@/lib/env";

export interface OcrResult {
  text: string;
  confidence: number;
  mock: boolean;
  error?: string;
}

// Flag — set to false if tesseract fails to load once, then stay on mock for the process.
let tesseractAvailable: boolean | null = null;

/**
 * Extracts text from an image buffer using tesseract.js.
 * Falls back to mock mode if tesseract fails or is unavailable.
 * In sandbox/serverless environments tesseract.js may fail to spawn its worker
 * script — in that case we permanently switch to mock mode for the process.
 */
export async function extractTextFromImage(
  buffer: Buffer,
  _mimeType: string = "image/png"
): Promise<OcrResult> {
  if (env.OCR_PROVIDER !== "local") {
    return mockOcr(buffer);
  }
  if (tesseractAvailable === false) {
    return mockOcr(buffer);
  }
  try {
    // Dynamic import — tesseract.js is heavy and only needed server-side
    const mod = await import("tesseract.js");
    const createWorker = mod.createWorker;
    if (typeof createWorker !== "function") {
      tesseractAvailable = false;
      return mockOcr(buffer);
    }
    const worker = await createWorker("eng");
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    tesseractAvailable = true;
    return {
      text: data.text ?? "",
      confidence: typeof data.confidence === "number" ? data.confidence / 100 : 0.7,
      mock: false,
    };
  } catch (e) {
    tesseractAvailable = false;
    console.warn("[ocr] Tesseract failed, switching to mock mode for this process:", e instanceof Error ? e.message : String(e));
    return mockOcr(buffer);
  }
}

function mockOcr(buffer: Buffer): OcrResult {
  // Heuristic mock: use buffer length to pick a plausible candidate from the seeded repos
  const size = buffer.length;
  const samples = [
    "github.com/docling-project/docling",
    "github.com/unclecode/crawl4ai",
    "github.com/QuivrHQ/MegaParse",
    "github.com/jina-ai/reader",
    "github.com/mem0ai/mem0",
    "github.com/OpenHands/OpenHands",
    "github.com/firecrawl/firecrawl",
  ];
  const text = samples[size % samples.length];
  return {
    text,
    confidence: 0.4,
    mock: true,
  };
}
