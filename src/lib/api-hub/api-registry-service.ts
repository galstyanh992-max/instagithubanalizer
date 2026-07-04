import type { ApiCategory, ApiConnectionStatus, ApiRegistryItem, ConnectionTestPlan, DailyTopicReportPlan } from "./types";
import { validateSecretRef, containsSecret, redactApiRegistryItem } from "./secret-policy";
import { DEFAULT_APIS } from "./defaults";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

const store = new Map<string, ApiRegistryItem>();

function seed() {
  if (store.size === 0) for (const a of DEFAULT_APIS) store.set(a.id, a);
}
seed();

export function resetRegistry() {
  store.clear();
  seed();
}

export function registerApi(item: ApiRegistryItem): { ok: boolean; reason: string; item?: ApiRegistryItem } {
  const ref = validateSecretRef(item.secretRef);
  if (!ref.ok) return { ok: false, reason: ref.reason };
  // Never store a real secret in any field.
  for (const [k, v] of Object.entries(item)) {
    if (k === "secretRef") continue;
    if (typeof v === "string" && containsSecret(v)) return { ok: false, reason: `field '${k}' contains a real secret value` };
  }
  store.set(item.id, item);
  void recordBrainEntry({ type: "api_reference", title: `api registered: ${item.id}`, content: `${item.provider}/${item.category}`, metadata: { id: item.id, category: item.category, secretRef: item.secretRef } });
  return { ok: true, reason: "registered", item };
}

export function listApis(filters?: { category?: ApiCategory; enabled?: boolean }): ApiRegistryItem[] {
  let out = [...store.values()];
  if (filters?.category) out = out.filter((a) => a.category === filters.category);
  if (filters?.enabled !== undefined) out = out.filter((a) => a.enabled === filters.enabled);
  return out.map(redactApiRegistryItem);
}

export function getApiById(id: string): ApiRegistryItem | null {
  const a = store.get(id);
  return a ? redactApiRegistryItem(a) : null;
}

export function getApisByCategory(category: ApiCategory): ApiRegistryItem[] {
  return listApis({ category });
}

export function updateApiStatus(id: string, status: ApiConnectionStatus): boolean {
  const a = store.get(id);
  if (!a) return false;
  a.status = status;
  store.set(id, a);
  return true;
}

export function getApiCapabilities(id: string) {
  return store.get(id)?.capabilities ?? [];
}

/** Never performs a network call. */
export function planConnectionTest(id: string): ConnectionTestPlan | null {
  const a = store.get(id);
  if (!a) return null;
  return {
    apiId: a.id,
    provider: a.provider,
    status: a.secretRef ? "PLANNED" : "NOT_RUN",
    requiresSecretRef: a.secretRef,
    steps: [
      `Resolve secret from env var ${a.secretRef ?? "<none>"} (never logged).`,
      `Issue minimal read/ping request to ${a.baseUrl ?? a.provider} (NOT RUN in foundation).`,
      "Record status without exposing secret.",
    ],
    note: "Connection test is planned only — no external call performed.",
  };
}

export function buildDailyTopicReportPlan(topic: string): DailyTopicReportPlan {
  const cat = topic.toLowerCase() as ApiCategory;
  const apis = [...store.values()].filter((a) => a.category === cat || a.name.toLowerCase().includes(topic.toLowerCase())).map((a) => a.id);
  return {
    topic,
    apis,
    status: "PLANNED",
    steps: [
      `Collect data from APIs in topic '${topic}': ${apis.join(", ") || "none configured"}.`,
      "Aggregate + summarize (planned).",
      "Store report in Project Brain as daily_note (planned).",
    ],
  };
}
