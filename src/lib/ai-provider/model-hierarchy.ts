// ─── JARVIS Model Hierarchy ─────────────────────────────────
// Role-based model routing: each role maps to a specific provider+model.
// Inspired by the user's architecture:
//   GPT-5.5 Thinking  → Orchestrator / CEO / Research / Design Critic
//   GLM 5.2           → Senior Software Engineer (frontend/backend/refactor)
//   Kimi K2.7 Code    → Second developer (MCP / tool use / agents / browser)
//   Legal Armenia AI  → Isolated legal/RAG/PDF/embeddings model
//   Ollama Cloud      → Memory / fast utility / fallback

import 'server-only';

import { env } from '@/lib/env';
import { providerRegistry } from './provider-registry';
import { getProviderEntryById } from './providers';

export type ModelRole =
  | 'orchestrator'
  | 'senior_dev'
  | 'second_dev'
  | 'designer'
  | 'design_critic'
  | 'research'
  | 'browser'
  | 'memory'
  | 'legal'
  | 'media';

export interface RoleBinding {
  role: ModelRole;
  providerId: string;
  model: string;
  /** Human-readable description of what this role does */
  description: string;
  /** Whether this role is currently configured and available */
  available: boolean;
}

export interface RoleFallback {
  role: ModelRole;
  preferred: { providerId: string; model: string } | null;
  fallbacks: { providerId: string; model: string }[];
}

const ROLE_DESCRIPTIONS: Record<ModelRole, string> = {
  orchestrator: 'CEO brain — planning, architecture, project-wide reasoning',
  senior_dev: 'Senior Software Engineer — frontend, backend, refactoring, large projects',
  second_dev: 'Automation Engineer — MCP, tool use, agent loops, fast code, UI images',
  designer: 'Creative Director — generates design proposals',
  design_critic: 'Design Critic — audits and improves design proposals',
  research: 'Analyst — deep research, analysis, fact-checking',
  browser: 'Browser Agent — executes actions in the browser',
  memory: 'Memory Agent — long-term memory, embeddings, retrieval',
  legal: 'Legal Armenia — RAG, PDF, laws, embeddings, reranking (isolated)',
  media: 'Media generation — image/video/music/transcription',
};

/**
 * Resolve the configured provider+model for a role from env overrides.
 * Returns null if the env override is not set or the provider is not configured.
 */
function resolveEnvOverride(providerEnv: string, modelEnv: string): { providerId: string; model: string } | null {
  const providerId = providerEnv.trim();
  const model = modelEnv.trim();
  if (!providerId) return null;
  const entry = getProviderEntryById(providerId);
  if (!entry || !entry.isConfigured()) return null;
  return { providerId, model: model || entry.config.defaultModel };
}

/**
 * Build the role binding table from env overrides + provider availability.
 */
export function resolveRoleBindings(): RoleBinding[] {
  const overrides: Array<{ role: ModelRole; providerEnv: string; modelEnv: string; fallback: string }> = [
    { role: 'orchestrator', providerEnv: env.JARVIS_ROLE_ORCHESTRATOR_PROVIDER, modelEnv: env.JARVIS_ROLE_ORCHESTRATOR_MODEL, fallback: 'openai-thinking' },
    { role: 'senior_dev', providerEnv: env.JARVIS_ROLE_SENIOR_DEV_PROVIDER, modelEnv: env.JARVIS_ROLE_SENIOR_DEV_MODEL, fallback: 'glm' },
    { role: 'second_dev', providerEnv: env.JARVIS_ROLE_SECOND_DEV_PROVIDER, modelEnv: env.JARVIS_ROLE_SECOND_DEV_MODEL, fallback: 'kimi' },
    { role: 'designer', providerEnv: env.JARVIS_ROLE_DESIGNER_PROVIDER, modelEnv: env.JARVIS_ROLE_DESIGNER_MODEL, fallback: 'glm' },
    { role: 'design_critic', providerEnv: env.JARVIS_ROLE_DESIGN_CRITIC_PROVIDER, modelEnv: env.JARVIS_ROLE_DESIGN_CRITIC_MODEL, fallback: 'openai-thinking' },
    { role: 'research', providerEnv: env.JARVIS_ROLE_RESEARCH_PROVIDER, modelEnv: env.JARVIS_ROLE_RESEARCH_MODEL, fallback: 'openai-thinking' },
    { role: 'browser', providerEnv: env.JARVIS_ROLE_BROWSER_PROVIDER, modelEnv: env.JARVIS_ROLE_BROWSER_MODEL, fallback: 'kimi' },
    { role: 'memory', providerEnv: env.JARVIS_ROLE_MEMORY_PROVIDER, modelEnv: env.JARVIS_ROLE_MEMORY_MODEL, fallback: 'ollama-cloud' },
    { role: 'legal', providerEnv: env.JARVIS_ROLE_LEGAL_PROVIDER, modelEnv: env.JARVIS_ROLE_LEGAL_MODEL, fallback: 'legal-ai' },
    { role: 'media', providerEnv: '', modelEnv: '', fallback: 'openrouter' },
  ];

  return overrides.map(({ role, providerEnv, modelEnv, fallback }) => {
    const preferred = resolveEnvOverride(providerEnv, modelEnv);
    const fallbackEntry = getProviderEntryById(fallback);
    const fallbackAvailable = fallbackEntry?.isConfigured() ?? false;

    let providerId: string;
    let model: string;
    let available: boolean;

    if (preferred) {
      providerId = preferred.providerId;
      model = preferred.model;
      available = true;
    } else if (fallbackAvailable) {
      providerId = fallback;
      model = fallbackEntry!.config.defaultModel;
      available = true;
    } else {
      // Last resort: first configured provider
      const firstConfigured = providerRegistry.listIds()[0];
      if (firstConfigured) {
        const entry = getProviderEntryById(firstConfigured);
        providerId = firstConfigured;
        model = entry?.config.defaultModel ?? '';
        available = true;
      } else {
        providerId = fallback;
        model = '';
        available = false;
      }
    }

    return {
      role,
      providerId,
      model,
      description: ROLE_DESCRIPTIONS[role],
      available,
    };
  });
}

/**
 * Resolve a single role binding.
 */
export function resolveRoleBinding(role: ModelRole): RoleBinding {
  return resolveRoleBindings().find((b) => b.role === role) ?? {
    role,
    providerId: 'mock',
    model: '',
    description: ROLE_DESCRIPTIONS[role],
    available: false,
  };
}

/**
 * Get the provider instance for a role.
 */
export function getRoleProvider(role: ModelRole) {
  const binding = resolveRoleBinding(role);
  if (!binding.available) {
    throw new Error(`Role '${role}' is not available — no provider configured`);
  }
  return providerRegistry.getOrThrow(binding.providerId);
}

/**
 * Get the model ID for a role.
 */
export function getRoleModel(role: ModelRole): string {
  return resolveRoleBinding(role).model;
}

/**
 * Human-readable label for a role binding (for UI display).
 */
export function getRoleLabel(role: ModelRole): string {
  const binding = resolveRoleBinding(role);
  const entry = getProviderEntryById(binding.providerId);
  return `${entry?.name ?? binding.providerId} · ${binding.model || 'default'}`;
}