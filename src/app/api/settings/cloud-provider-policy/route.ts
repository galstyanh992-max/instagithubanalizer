// GET/PATCH /api/settings/cloud-provider-policy — read/update provider policy.
// Per project policy: only "ollama_cloud" is allowed. PATCH cannot add other providers.

import { db } from "@/lib/db";
import { ok, err, safe, parseJson } from "@/lib/api";
import { CLOUD_PROVIDER_POLICY, OLLAMA_CLOUD_PROVIDER, PRICING_NOTE } from "@/lib/constants";

export const GET = safe(async () => {
  let s = await db.setting.findUnique({ where: { id: "singleton" } });
  if (!s) {
    s = await db.setting.create({ data: { id: "singleton" } });
  }
  return ok({
    providerPolicy: {
      allowedProviders: CLOUD_PROVIDER_POLICY.allowedProviders,
      selectedProvider: s.cloudProvider || CLOUD_PROVIDER_POLICY.defaultProvider,
      otherProvidersDisabled: true,
      note: CLOUD_PROVIDER_POLICY.rule,
    },
    providerInfo: OLLAMA_CLOUD_PROVIDER,
    pricing: {
      provider: "ollama_cloud",
      providerName: OLLAMA_CLOUD_PROVIDER.name,
      status: OLLAMA_CLOUD_PROVIDER.pricingStatus,
      note: PRICING_NOTE,
      checkedAt: null,
    },
  });
});

export const PATCH = safe(async (req: Request) => {
  const body = await parseJson<{ selectedProvider?: string }>(req);
  // The policy is fixed — only ollama_cloud is allowed.
  // We accept the PATCH but ignore any attempt to select another provider.
  if (body.selectedProvider && body.selectedProvider !== "ollama_cloud") {
    return err(
      `Provider '${body.selectedProvider}' is disallowed by policy. Only 'ollama_cloud' is allowed.`,
      403
    );
  }
  await db.setting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", cloudProvider: "ollama_cloud", allowedCloudProviders: "ollama_cloud" },
    update: { cloudProvider: "ollama_cloud", allowedCloudProviders: "ollama_cloud" },
  });
  return ok({
    ok: true,
    providerPolicy: {
      allowedProviders: CLOUD_PROVIDER_POLICY.allowedProviders,
      selectedProvider: "ollama_cloud",
      otherProvidersDisabled: true,
      note: CLOUD_PROVIDER_POLICY.rule,
    },
  });
});
