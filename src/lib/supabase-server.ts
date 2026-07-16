import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export type StorageFile = {
  bucket: string;
  key: string;
  publicUrl: string;
  mimeType: string;
  size?: number;
};

let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!adminClient) {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }
    adminClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );
  }
  return adminClient;
}

/**
 * Upload a buffer to Supabase Storage.
 * Uses direct REST API to avoid SDK fetch issues in Next.js dev server.
 * Returns the public URL + bucket/key path.
 */
export async function uploadToStorage(
  buffer: Buffer,
  key: string,
  mimeType: string,
  bucket = env.SUPABASE_STORAGE_BUCKET
): Promise<StorageFile> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${key}`;
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: new Uint8Array(buffer) as BodyInit,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "unknown");
        throw new Error(`Supabase upload HTTP ${res.status}: ${text}`);
      }

      return {
        bucket,
        key,
        publicUrl,
        mimeType,
        size: buffer.length,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[supabase] upload attempt ${attempt}/3 failed: ${lastError.message}`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`Supabase upload failed after 3 retries: ${lastError?.message}`);
}

/**
 * Download a file from Supabase Storage.
 * Uses direct REST API.
 */
export async function downloadFromStorage(
  key: string,
  bucket = env.SUPABASE_STORAGE_BUCKET
): Promise<Buffer> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${key}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Supabase download failed (HTTP ${res.status}): ${text}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Remove a file from Supabase Storage.
 * Uses direct REST API.
 */
export async function deleteFromStorage(
  key: string,
  bucket = env.SUPABASE_STORAGE_BUCKET
): Promise<void> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${key}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Supabase delete failed (HTTP ${res.status}): ${text}`);
  }
}

/**
 * Parse a public Supabase Storage URL into bucket + key.
 * Accepts URLs like:
 * https://<project>.supabase.co/storage/v1/object/public/<bucket>/<key>
 */
export function parseStorageUrl(url: string): { bucket: string; key: string } | null {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: match[1], key: match[2] };
}

/**
 * Ensure the configured storage bucket exists.
 * Uses direct REST API.
 */
export async function ensureStorageBucket(
  bucket = env.SUPABASE_STORAGE_BUCKET
): Promise<void> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");

  // Check if bucket exists
  const listRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!listRes.ok) {
    throw new Error(`Failed to list buckets (HTTP ${listRes.status})`);
  }

  const buckets = await listRes.json() as { name: string }[];
  const exists = buckets?.some((b) => b.name === bucket);
  if (!exists) {
    const createRes = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: true,
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text().catch(() => "unknown");
      throw new Error(`Failed to create bucket ${bucket} (HTTP ${createRes.status}): ${text}`);
    }
  }
}
