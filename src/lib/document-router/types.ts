export type DocumentEngine = 'opendataloader' | 'docling';

export interface DocumentConversionResult {
  ok: boolean;
  engine: DocumentEngine;
  inputPath: string;
  outputDirectory: string;
  markdownPath: string | null;
  jsonPath: string | null;
  durationMs: number;
  fallbackUsed: boolean;
  warnings: string[];
}

export interface DocumentEngineAdapter {
  readonly id: DocumentEngine;
  supports(extension: string): boolean;
  available(): Promise<{ available: boolean; version: string | null; reason: string | null }>;
  convert(inputPath: string, outputDirectory: string, timeoutMs: number): Promise<void>;
}
