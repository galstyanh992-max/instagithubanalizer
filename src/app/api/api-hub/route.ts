import { ok, err, safe, parseJson } from "@/lib/api";
import { z } from "zod";
import { listApis, registerApi } from "@/lib/api-hub/api-registry-service";
import type { ApiRegistryItem, ApiCategory } from "@/lib/api-hub/types";

export const runtime = "nodejs";

const CATEGORIES = ["ai","finance","news","social","content_generation","search","email","music","deployment","github","database","browser_data","analytics","custom"] as const;

const capSchema = z.object({
  id: z.string(), label: z.string(), description: z.string(),
  riskLevel: z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]), requiresApproval: z.boolean(),
});
const registerSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), category: z.enum(CATEGORIES),
  provider: z.string().min(1), description: z.string().optional(),
  secretRef: z.string().optional(), baseUrl: z.string().optional(), docsUrl: z.string().optional(),
  capabilities: z.array(capSchema).default([]),
  status: z.enum(["not_configured","configured","test_planned","test_passed","test_failed","not_run"]).default("not_configured"),
  enabled: z.boolean().default(false),
  costLevel: z.enum(["free","low","medium","high","unknown"]).optional(),
  notes: z.string().optional(),
});

export const GET = safe(async (req: Request) => {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") as ApiCategory | null;
  return ok({ apis: listApis(category ? { category } : undefined) });
});

export const POST = safe(async (req: Request) => {
  const body = await parseJson(req);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return err("invalid api item", 400, { issues: parsed.error.flatten() });
  const res = registerApi(parsed.data as ApiRegistryItem);
  if (!res.ok) return err(res.reason, 400);
  return ok({ id: parsed.data.id, status: "registered" });
});
