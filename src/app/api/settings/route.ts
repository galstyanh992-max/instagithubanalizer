import { db } from "@/lib/db";
import { ok, safe } from "@/lib/api";

export const GET = safe(async () => {
  try {
    let settings = await db.setting.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      settings = await db.setting.create({ data: { id: "singleton" } });
    }
    // Mask sensitive keys
    const safeData = {
      ...settings,
      githubToken: settings.githubToken ? "***" : "",
      glmApiKey: settings.glmApiKey ? "***" : "",
    };
    return ok({ settings: safeData });
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
  const body = await req.json();
  // Don't overwrite secrets with masked values
  if (body.githubToken === "***") delete body.githubToken;
  if (body.glmApiKey === "***") delete body.glmApiKey;

  let settings = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    settings = await db.setting.create({ data: { id: "singleton", ...body } });
  } else {
    settings = await db.setting.update({
      where: { id: "singleton" },
      data: body,
    });
  }
  const safe = {
    ...settings,
    githubToken: settings.githubToken ? "***" : "",
    glmApiKey: settings.glmApiKey ? "***" : "",
  };
  return ok({ settings: safe });
});
