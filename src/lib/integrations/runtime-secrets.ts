import "server-only";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Reads secrets only on the server. Browser clients receive a mask, never the value. */
export async function getGitHubToken(): Promise<string> {
  try {
    const settings = await db.setting.findUnique({
      where: { id: "singleton" },
      select: { githubToken: true },
    });
    return settings?.githubToken || env.GITHUB_TOKEN;
  } catch {
    return env.GITHUB_TOKEN;
  }
}
