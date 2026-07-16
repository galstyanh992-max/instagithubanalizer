// Agent OS - AI provider type-only barrel.
// Runtime provider initialization is intentionally isolated in server.ts so
// env-only provider code cannot be pulled into a client bundle by accident.

export type * from './types';
export { providerRegistry } from './provider-registry';
export { resolveDefaultProviderId, resolveProviderId, getDefaultProvider } from './default-provider';
export { getModelConfigForRole, getOpenRouterModelConfigForRole, OPENROUTER_MODELS, OPENROUTER_PROVIDER_ID } from './model-registry';
export { getDefaultModelsForProvider } from './default-models';
