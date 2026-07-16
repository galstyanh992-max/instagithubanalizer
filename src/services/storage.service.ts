import { randomUUID } from "node:crypto";
import {
  uploadToStorage,
  downloadFromStorage,
  deleteFromStorage,
  ensureStorageBucket,
  type StorageFile,
} from "@/lib/supabase-server";

export type { StorageFile };

const BUCKETS = {
  files: "jarwisyan-files",
  screenshots: "jarwisyan-screenshots",
  tts: "jarwisyan-tts",
  imports: "jarwisyan-imports",
} as const;

export function getBucketName(type: keyof typeof BUCKETS) {
  return BUCKETS[type];
}

export function buildStorageKey(
  type: keyof typeof BUCKETS,
  fileName: string,
  id: string = randomUUID()
): string {
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${type}/${id}/${cleanName}`;
}

/**
 * Upload any buffer to Supabase Storage with the right bucket.
 */
export async function uploadAsset(
  type: "files" | "screenshots" | "tts" | "imports",
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  id?: string
): Promise<StorageFile> {
  await ensureStorageBucket(getBucketName(type));
  const key = buildStorageKey(type, fileName, id);
  return uploadToStorage(buffer, key, mimeType, getBucketName(type));
}

/**
 * Download an asset by its storage key and bucket type.
 */
export async function downloadAsset(
  type: "files" | "screenshots" | "tts" | "imports",
  key: string
): Promise<Buffer> {
  return downloadFromStorage(key, getBucketName(type));
}

/**
 * Delete an asset by its storage key and bucket type.
 */
export async function deleteAsset(
  type: "files" | "screenshots" | "tts" | "imports",
  key: string
): Promise<void> {
  return deleteFromStorage(key, getBucketName(type));
}

/**
 * Convert a File (from FormData) to a Buffer.
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}
