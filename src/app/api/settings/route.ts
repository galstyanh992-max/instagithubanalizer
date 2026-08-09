import { db } from "@/lib/db";
import { ok, safe } from "@/lib/api";

// Secrets are masked ("***") on read and never overwritten by masked values on write.
const secretFields = [
  "githubToken",
  "glmApiKey",
  "vercelToken",
  "supabaseAccessToken",
  "supabaseServiceRoleKey",
] as const;

// Whitelist of updatable Setting fields. Prevents Prisma "unknown argument"
// errors when the client sends fields that do not exist on the model (which
// previously caused the whole PATCH to be rejected atomically — losing all
// integration tokens and provider routes in a single save).
const updatableFields = [
  "githubToken",
  "aiProvider",
  "glmApiKey",
  "glmBaseUrl",
  "ocrProvider",
  "ttsProvider",
  "sttProvider",
  "vercelToken",
  "supabaseAccessToken",
  "supabaseProjectUrl",
  "supabaseServiceRoleKey",
  "providerRoutes",
  "cloudProvider",
  "allowedCloudProviders",
  "language",
  "enable3d",
  "reduceMotion",
  "compactMode",
  "neonIntensity",
  "voiceEnabled",
  "autoSpeak",
  "projectAgentOs",
  "projectAiLegal",
  "projectRagOcr",
  "projectVideo",
  "projectSaas",
  "projectTrading",
  "cpu",
  "ram",
  "gpu",
  "vram",
  "os",
  "freeDiskGb",
  "dockerAvailable",
  "pythonVersion",
  "nodeVersion",
  "gitAvailable",
  "cudaAvailable",
  "pcProfileName",
  "pcSystemType",
  "pcCpuNotes",
  "pcStorageTotalGb",
  "pcStorageUsedGb",
  "pcCudaNotes",
  "pcRocmAvailable",
  "pcPreferredRunMode",
  "pcFallbackRunMode",
] as const;

function maskSecrets<T extends Record<string, unknown>>(settings: T) {
  const safeData: Record<string, unknown> = { ...settings };
  for (const key of secretFields) {
    if (safeData[key]) safeData[key] = "***";
  }
  return safeData;
}

function pickUpdatable(body: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of updatableFields) {
    if (key in body) {
      // Don't overwrite secrets with the masked placeholder.
      if ((secretFields as readonly string[]).includes(key) && body[key] === "***") continue;
      picked[key] = body[key];
    }
  }
  return picked;
}

export const GET = safe(async () => {
  try {
    let settings = await db.setting.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      settings = await db.setting.create({ data: { id: "singleton" } });
    }
    // Mask sensitive keys
    return ok({ settings: maskSecrets(settings) });
  } catch (e) {
    return ok({
      ok: true,
      fallbackUsed: true,
      message: "Данные загружены в fallback-режиме (база недоступна).",
      settings: { id: "singleton", aiProvider: "mock", glmApiKey: "" }
    });
  }
});

export const PATCH = safe(async (req: Request) => {
  const body = (await req.json()) as Record<string, unknown>;
  const data = pickUpdatable(body);

  let settings = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    settings = await db.setting.create({ data: { id: "singleton", ...data } });
  } else {
    settings = await db.setting.update({
      where: { id: "singleton" },
      data,
    });
  }
  return ok({ settings: maskSecrets(settings) });
});
