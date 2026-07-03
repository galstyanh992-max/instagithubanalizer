// ─── Agent OS — Stage 3: Skills Barrel Export ──────────────────

// Types
export type {
  ISkill,
  SkillContext,
  SkillRegistration,
  SkillRegistryStats,
} from './types';

// Registry (in-memory)
export { skillRegistry } from './registry';

// Built-in Skills
export { planningSkill } from './skills/planning-skill';
export { summarizationSkill } from './skills/summarization-skill';
export { validationSkill } from './skills/validation-skill';

// Convenience: all built-in skills as an array
import { planningSkill } from './skills/planning-skill';
import { summarizationSkill } from './skills/summarization-skill';
import { validationSkill } from './skills/validation-skill';

export const BUILTIN_SKILLS = [planningSkill, summarizationSkill, validationSkill];

// Re-export the DB-backed SkillRegistryService from skill-registry module
export { skillRegistryService } from '../skill-registry';
