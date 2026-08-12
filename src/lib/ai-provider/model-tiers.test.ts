import { describe, expect, it } from 'vitest';
import {
  TIER_CANDIDATES,
  resolveTierCandidates,
  meetsQualityFloor,
  isCloudProvider,
  QUALITY_FLOOR_TIER,
} from './model-tiers';

describe('resolveTierCandidates — LOCAL_ONLY_PRIVACY hard gate', () => {
  it('strips every cloud candidate for LOCAL_ONLY, even for cloud-only tiers', () => {
    for (const tier of Object.keys(TIER_CANDIDATES) as Array<keyof typeof TIER_CANDIDATES>) {
      const candidates = resolveTierCandidates(tier, 'LOCAL_ONLY');
      for (const c of candidates) {
        expect(isCloudProvider(c.providerId)).toBe(false);
      }
    }
  });

  it('a LOCAL_ONLY request for CLOUD_STRONG returns no candidates rather than silently leaking to a cloud provider', () => {
    expect(resolveTierCandidates('CLOUD_STRONG', 'LOCAL_ONLY')).toEqual([]);
  });

  it('CLOUD_ALLOWED and CLOUD_PREFERRED both return the full real candidate chain unfiltered', () => {
    expect(resolveTierCandidates('CLOUD_STRONG', 'CLOUD_ALLOWED')).toEqual(TIER_CANDIDATES.CLOUD_STRONG);
    expect(resolveTierCandidates('CLOUD_STRONG', 'CLOUD_PREFERRED')).toEqual(TIER_CANDIDATES.CLOUD_STRONG);
  });

  it('LOCAL_FAST is untouched by the privacy gate (it was never a cloud tier)', () => {
    expect(resolveTierCandidates('LOCAL_FAST', 'LOCAL_ONLY')).toEqual(TIER_CANDIDATES.LOCAL_FAST);
  });
});

describe('meetsQualityFloor — QUALITY_FLOOR_ROUTING', () => {
  it('rejects routing Q4_CRITICAL work through the cheapest tier', () => {
    expect(meetsQualityFloor('CLOUD_ULTRA_CHEAP', 'Q4_CRITICAL')).toBe(false);
  });

  it('accepts CLOUD_STRONG for Q4_CRITICAL work', () => {
    expect(meetsQualityFloor('CLOUD_STRONG', 'Q4_CRITICAL')).toBe(true);
  });

  it('accepts CLOUD_ULTRA_CHEAP for Q1_LOW work (COST_AWARE_ROUTING: do not overspend on easy tasks)', () => {
    expect(meetsQualityFloor('CLOUD_ULTRA_CHEAP', 'Q1_LOW')).toBe(true);
    expect(QUALITY_FLOOR_TIER.Q1_LOW).toBe('CLOUD_ULTRA_CHEAP');
  });

  it('a stronger-than-required tier still satisfies a weaker floor', () => {
    expect(meetsQualityFloor('CLOUD_STRONG', 'Q1_LOW')).toBe(true);
  });
});

describe('TIER_CANDIDATES sanity', () => {
  it('every tier has at least one candidate', () => {
    for (const [tier, candidates] of Object.entries(TIER_CANDIDATES)) {
      expect(candidates.length, `${tier} should not be empty`).toBeGreaterThan(0);
    }
  });

  it('CLOUD_ULTRA_CHEAP never selects the region-blocked deepseek-v4-flash via OpenCode Go', () => {
    const blocked = TIER_CANDIDATES.CLOUD_ULTRA_CHEAP.find(
      (c) => c.providerId === 'opencode-go' && c.model === 'deepseek-v4-flash',
    );
    expect(blocked).toBeUndefined();
  });
});
