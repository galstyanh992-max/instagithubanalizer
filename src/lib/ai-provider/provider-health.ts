import type { AIProvider } from "./types";

export type ProviderHealthCode =
  | "CONNECTED"
  | "AUTH_REQUIRED"
  | "UNAVAILABLE"
  | "INVALID_MODEL"
  | "TIMEOUT"
  | "ADAPTER_ERROR";

export interface ProviderHealthResult {
  ok: boolean;
  providerId: string;
  code: ProviderHealthCode;
  message: string;
  latencyMs: number;
  model?: string;
  modelsChecked?: number;
}

const SECRET_PATTERN =
  /\b(?:sk|key|token|bearer|password|secret)[-_=: ]+[A-Za-z0-9._~+/=-]{8,}\b/gi;

export function safeProviderMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Provider adapter failed.";
  return raw.replace(SECRET_PATTERN, "[REDACTED]").slice(0, 240);
}

export async function testProviderHealth(
  provider: AIProvider | undefined,
  options: { providerId: string; model?: string; timeoutMs?: number },
): Promise<ProviderHealthResult> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 10_000;
  const base = () => ({ providerId: options.providerId, latencyMs: Date.now() - startedAt });

  if (!provider || provider.id === "mock") {
    return {
      ...base(),
      ok: false,
      code: "AUTH_REQUIRED",
      message: "Real provider credentials are not configured.",
    };
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const operation = async (): Promise<ProviderHealthResult> => {
      const available = await provider.isAvailable();
      if (!available) {
        return {
          ...base(),
          ok: false,
          code: "UNAVAILABLE",
          message: "Provider health endpoint rejected or could not complete the request.",
        };
      }

      if (options.model) {
        if (!provider.listModels) {
          return {
            ...base(),
            ok: false,
            code: "INVALID_MODEL",
            message: "The adapter cannot verify model availability.",
            model: options.model,
          };
        }
        const models = await provider.listModels();
        if (!models.some((entry) => entry.id === options.model)) {
          return {
            ...base(),
            ok: false,
            code: "INVALID_MODEL",
            message: "The requested model was not returned by the provider.",
            model: options.model,
            modelsChecked: models.length,
          };
        }
        return {
          ...base(),
          ok: true,
          code: "CONNECTED",
          message: "Provider and model are reachable.",
          model: options.model,
          modelsChecked: models.length,
        };
      }

      return {
        ...base(),
        ok: true,
        code: "CONNECTED",
        message: "Provider health endpoint is reachable.",
      };
    };

    const timedOut = new Promise<ProviderHealthResult>((resolve) => {
      timeout = setTimeout(
        () =>
          resolve({
            ...base(),
            ok: false,
            code: "TIMEOUT",
            message: "Provider health check timed out.",
          }),
        timeoutMs,
      );
    });

    return await Promise.race([operation(), timedOut]);
  } catch (error) {
    return {
      ...base(),
      ok: false,
      code: "ADAPTER_ERROR",
      message: safeProviderMessage(error),
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
