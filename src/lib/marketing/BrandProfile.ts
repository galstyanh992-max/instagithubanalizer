// ─── Agent OS — BrandProfile ──────────────────────────────────
// Loads brand voice, tone rules, forbidden claims, and platform constraints.
// Can be extended to use Prisma-backed overrides per workspace.

import defaultProfile from '../../config/brandProfile.json';

export interface BrandProfileData {
  name: string;
  brandVoice: string[];
  targetAudience: string[];
  forbiddenClaims: string[];
  requiredDisclaimers: string[];
  toneRules: string[];
  toneKeywords: { positive: string[]; negative: string[] };
  ctaPhrases: string[];
  platformRules: Record<string, { maxLength: number; hashtagMax: number; minCTA: number }>;
  legalRiskKeywords: string[];
  prRiskKeywords: string[];
  visualStyleRules?: string[];
}

// In-memory workspace overrides (populated via API or Prisma in future)
const workspaceOverrides = new Map<string, Partial<BrandProfileData>>();

class BrandProfileService {
  private static instance: BrandProfileService | null = null;

  private constructor() {}

  static getInstance(): BrandProfileService {
    if (!BrandProfileService.instance) BrandProfileService.instance = new BrandProfileService();
    return BrandProfileService.instance;
  }

  /** Get brand profile, merging workspace overrides with defaults */
  get(workspaceId?: string): BrandProfileData {
    const base = defaultProfile as BrandProfileData;
    if (!workspaceId) return base;
    const override = workspaceOverrides.get(workspaceId);
    if (!override) return base;
    return { ...base, ...override };
  }

  /** Apply a workspace-specific override (partial) */
  setOverride(workspaceId: string, override: Partial<BrandProfileData>): void {
    workspaceOverrides.set(workspaceId, override);
  }

  /** Append terms to forbidden claims for a workspace */
  addForbiddenClaims(workspaceId: string, claims: string[]): void {
    const current = this.get(workspaceId);
    this.setOverride(workspaceId, {
      forbiddenClaims: [...new Set([...current.forbiddenClaims, ...claims])],
    });
  }

  /** Append brand voice keywords for a workspace */
  addBrandVoice(workspaceId: string, keywords: string[]): void {
    const current = this.get(workspaceId);
    this.setOverride(workspaceId, {
      brandVoice: [...new Set([...current.brandVoice, ...keywords])],
    });
  }
}

export const brandProfileService = BrandProfileService.getInstance();
