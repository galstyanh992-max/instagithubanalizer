// ─── Agent OS — ContentReviewService ─────────────────────────
// Local rule-based content review engine.
// No external API calls — all checks run in-process.
// Used by Copywriter, CommunityManager, Publisher, MessengerSupport.

import { brandProfileService } from './BrandProfile';

// ── Public types ──────────────────────────────────────────────

export type ReviewRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ReviewDimension {
  name: string;
  score: number;    // 0–100
  weight: number;   // contribution to total score (0–1, sum = 1)
  issues: string[];
  suggestions: string[];
}

export interface ReviewResult {
  score: number;              // 0–100 composite
  riskLevel: ReviewRiskLevel;
  approved: boolean;          // true if low/medium and no blocking issues
  dimensions: ReviewDimension[];
  issues: string[];           // all issues flattened
  suggestedFixes: string[];   // all suggestions flattened
  platform: string;
  checkedAt: string;
  // Convenience flags
  requiresHumanReview: boolean;   // true for medium+
  blockedFromPublishing: boolean; // true for high/critical
}

export interface ReviewOptions {
  platform?: string;
  workspaceId?: string;
  agentRole?: string;
}

// ── Scoring helpers ───────────────────────────────────────────

function words(text: string): string[] {
  return text.toLowerCase().match(/\b\w+\b/g) ?? [];
}

function sentences(text: string): string[] {
  return text.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 5);
}

// ── ContentReviewService ──────────────────────────────────────

class ContentReviewService {
  private static instance: ContentReviewService | null = null;

  private constructor() {}

  static getInstance(): ContentReviewService {
    if (!ContentReviewService.instance) ContentReviewService.instance = new ContentReviewService();
    return ContentReviewService.instance;
  }

  /**
   * Primary entrypoint — review text content against brand profile.
   */
  reviewContent(text: string, options: ReviewOptions = {}): ReviewResult {
    const platform = (options.platform ?? 'general').toLowerCase();
    const profile = brandProfileService.get(options.workspaceId);
    const wordList = words(text);
    const lowerText = text.toLowerCase();

    // Run all dimensions
    const dimensions: ReviewDimension[] = [
      this.checkClarity(text, wordList),
      this.checkCTAStrength(lowerText, profile.ctaPhrases),
      this.checkBrandFit(wordList, lowerText, profile),
      this.checkToneMatch(lowerText, wordList, profile),
      this.checkAudienceFit(wordList, lowerText, profile.targetAudience),
      this.checkLegalSafety(lowerText, profile),
      this.checkPlatformFit(text, platform, profile),
    ];

    // Composite score (weighted)
    const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
    const rawScore = dimensions.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Aggregate issues and suggestions
    const issues = dimensions.flatMap(d => d.issues);
    const suggestedFixes = dimensions.flatMap(d => d.suggestions);

    // Determine risk level
    const riskLevel = this.computeRiskLevel(score, issues, lowerText, profile);

    const result: ReviewResult = {
      score,
      riskLevel,
      approved: riskLevel === 'low' || riskLevel === 'medium',
      dimensions,
      issues,
      suggestedFixes,
      platform,
      checkedAt: new Date().toISOString(),
      requiresHumanReview: riskLevel !== 'low',
      blockedFromPublishing: riskLevel === 'high' || riskLevel === 'critical',
    };

    return result;
  }

  // ── Dimension: Clarity ────────────────────────────────────

  private checkClarity(text: string, wordList: string[]): ReviewDimension {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Long words (>12 chars) penalty
    const longWords = wordList.filter(w => w.length > 12);
    if (longWords.length > 3) {
      score -= Math.min(20, (longWords.length - 3) * 4);
      issues.push(`${longWords.length} complex words detected (e.g., ${longWords.slice(0, 2).join(', ')})`);
      suggestions.push('Simplify vocabulary — replace long words with shorter equivalents');
    }

    // Sentence length penalty
    const sentenceList = sentences(text);
    const longSentences = sentenceList.filter(s => s.split(' ').length > 25);
    if (longSentences.length > 0) {
      score -= longSentences.length * 8;
      issues.push(`${longSentences.length} sentence(s) exceed 25 words`);
      suggestions.push('Break long sentences into 2–3 shorter ones for readability');
    }

    // Empty/very short content
    if (wordList.length < 10) {
      score -= 30;
      issues.push('Content is very short — may lack impact');
      suggestions.push('Add more substance: explain the value or include a story hook');
    }

    return { name: 'Clarity', score: Math.max(0, score), weight: 0.15, issues, suggestions };
  }

  // ── Dimension: CTA Strength ───────────────────────────────

  private checkCTAStrength(lowerText: string, ctaPhrases: string[]): ReviewDimension {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 60; // neutral base

    const foundCTAs = ctaPhrases.filter(cta => lowerText.includes(cta.toLowerCase()));

    if (foundCTAs.length === 0) {
      score = 40;
      issues.push('No call-to-action found');
      suggestions.push(`Add a CTA such as: "Get started", "Learn more", or "Book a demo"`);
    } else if (foundCTAs.length === 1) {
      score = 80;
    } else if (foundCTAs.length >= 2) {
      score = 95;
    }

    // Bonus for urgency words
    const urgency = ['today', 'now', 'limited', 'free', 'exclusive', 'only', 'last chance'];
    if (urgency.some(u => lowerText.includes(u))) {
      score = Math.min(100, score + 5);
    }

    return { name: 'CTA Strength', score, weight: 0.15, issues, suggestions };
  }

  // ── Dimension: Brand Fit ──────────────────────────────────

  private checkBrandFit(wordList: string[], lowerText: string, profile: ReturnType<typeof brandProfileService.get>): ReviewDimension {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 50;

    // Brand voice keyword matches
    const voiceMatches = profile.brandVoice.filter(kw => lowerText.includes(kw.toLowerCase()));
    score += Math.min(40, voiceMatches.length * 8);

    // Forbidden claims — critical penalty
    const forbiddenFound = profile.forbiddenClaims.filter(claim => lowerText.includes(claim.toLowerCase()));
    if (forbiddenFound.length > 0) {
      score = Math.max(0, score - forbiddenFound.length * 30);
      forbiddenFound.forEach(claim => {
        issues.push(`Forbidden claim detected: "${claim}"`);
        suggestions.push(`Remove or qualify the claim "${claim}" with appropriate caveats`);
      });
    }

    // Missing required disclaimers check
    const needsDisclaimer = profile.forbiddenClaims.some(c => lowerText.includes(c.toLowerCase()));
    if (needsDisclaimer) {
      const hasDisclaimer = profile.requiredDisclaimers.some(d => lowerText.includes(d.toLowerCase()));
      if (!hasDisclaimer && profile.requiredDisclaimers.length > 0) {
        score -= 10;
        issues.push('Missing required disclaimer for performance-related claims');
        suggestions.push(`Add a disclaimer such as: "${profile.requiredDisclaimers[0]}"`);
      }
    }

    if (voiceMatches.length === 0) {
      issues.push('No brand voice keywords detected');
      suggestions.push(`Include relevant brand terms such as: ${profile.brandVoice.slice(0, 3).join(', ')}`);
    }

    return { name: 'Brand Fit', score: Math.max(0, Math.min(100, score)), weight: 0.25, issues, suggestions };
  }

  // ── Dimension: Tone Match ─────────────────────────────────

  private checkToneMatch(lowerText: string, wordList: string[], profile: ReturnType<typeof brandProfileService.get>): ReviewDimension {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 75;

    // Negative tone keywords
    const negativeFound = profile.toneKeywords.negative.filter(w => lowerText.includes(w));
    if (negativeFound.length > 0) {
      score -= negativeFound.length * 15;
      issues.push(`Aggressive/negative language: "${negativeFound.join('", "')}"`);
      suggestions.push('Replace negative language with empowering, solution-focused alternatives');
    }

    // Positive tone keywords (bonus)
    const positiveFound = profile.toneKeywords.positive.filter(w => lowerText.includes(w));
    score += Math.min(25, positiveFound.length * 5);

    // Excessive punctuation
    const exclamationCount = (lowerText.match(/!/g) ?? []).length;
    if (exclamationCount > 3) {
      score -= (exclamationCount - 3) * 5;
      issues.push(`Excessive exclamation marks (${exclamationCount}) — appears unprofessional`);
      suggestions.push('Limit exclamation marks to 1–2 per post');
    }

    // ALL CAPS (excluding short words)
    const capsWords = wordList.filter(w => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
    if (capsWords.length > 2) {
      score -= capsWords.length * 5;
      issues.push(`All-caps words (${capsWords.join(', ')}) — reads as shouting`);
      suggestions.push('Use normal capitalization; bold or emphasis formatting for impact');
    }

    // Profanity (simple word list)
    const profanity = ['shit', 'fuck', 'damn', 'ass', 'bastard', 'crap', 'hell'];
    const profanityFound = profanity.filter(w => lowerText.includes(w));
    if (profanityFound.length > 0) {
      score -= 30;
      issues.push(`Profanity detected: "${profanityFound.join('", "')}"`);
      suggestions.push('Remove profanity — maintain professional brand voice');
    }

    return { name: 'Tone Match', score: Math.max(0, Math.min(100, score)), weight: 0.20, issues, suggestions };
  }

  // ── Dimension: Audience Fit ───────────────────────────────

  private checkAudienceFit(wordList: string[], lowerText: string, targetAudience: string[]): ReviewDimension {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 50;

    const audienceMatches = targetAudience.filter(term => lowerText.includes(term.toLowerCase()));
    score += Math.min(50, audienceMatches.length * 12);

    if (audienceMatches.length === 0) {
      issues.push('No target audience identifiers found');
      suggestions.push(`Reference your audience explicitly, e.g., "${targetAudience.slice(0, 2).join('" or "')}"`);
    }

    return { name: 'Audience Fit', score: Math.max(0, Math.min(100, score)), weight: 0.10, issues, suggestions };
  }

  // ── Dimension: Legal Safety ───────────────────────────────

  private checkLegalSafety(lowerText: string, profile: ReturnType<typeof brandProfileService.get>): ReviewDimension {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Legal risk keywords
    const legalRisks = profile.legalRiskKeywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    if (legalRisks.length > 0) {
      score -= legalRisks.length * 30;
      issues.push(`Legal risk language: "${legalRisks.join('", "')}"`);
      suggestions.push('Remove or neutralize legal-risk language — escalate to legal review');
    }

    // PR risk keywords
    const prRisks = profile.prRiskKeywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    if (prRisks.length > 0) {
      score -= prRisks.length * 25;
      issues.push(`PR risk language: "${prRisks.join('", "')}"`);
      suggestions.push('Remove PR-risk terms — risk of brand reputation damage');
    }

    // Money promises with $ or specific amounts without caveats
    const moneyPromise = /\$\d+|\d+[k]?\s*(dollars|usd|revenue|profit|income)/i;
    if (moneyPromise.test(lowerText) && !lowerText.includes('may vary') && !lowerText.includes('example')) {
      score -= 20;
      issues.push('Financial promise without disclaimer detected');
      suggestions.push('Add "results may vary" or clarify this is an example, not a guarantee');
    }

    return { name: 'Legal Safety', score: Math.max(0, Math.min(100, score)), weight: 0.25, issues, suggestions };
  }

  // ── Dimension: Platform Fit ───────────────────────────────

  private checkPlatformFit(text: string, platform: string, profile: ReturnType<typeof brandProfileService.get>): ReviewDimension {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 90;

    const rules = profile.platformRules[platform];
    if (!rules) return { name: 'Platform Fit', score: 85, weight: 0.10, issues: [], suggestions: [] };

    // Length check
    if (text.length > rules.maxLength) {
      score -= 25;
      issues.push(`Content exceeds ${platform} limit (${text.length}/${rules.maxLength} chars)`);
      suggestions.push(`Trim content to under ${rules.maxLength} characters`);
    }

    // Hashtag count
    const hashtagCount = (text.match(/#\w+/g) ?? []).length;
    if (hashtagCount > rules.hashtagMax) {
      score -= 10;
      issues.push(`Too many hashtags (${hashtagCount}/${rules.hashtagMax} max for ${platform})`);
      suggestions.push(`Reduce hashtags to ${rules.hashtagMax} most relevant`);
    }

    // Min CTA requirement
    if (rules.minCTA > 0) {
      const ctaFound = profile.ctaPhrases.some(cta => text.toLowerCase().includes(cta));
      if (!ctaFound) {
        score -= 10;
        issues.push(`${platform} posts should include a call-to-action`);
        suggestions.push('Add a CTA button or link phrase');
      }
    }

    return { name: 'Platform Fit', score: Math.max(0, score), weight: 0.10, issues, suggestions };
  }

  // ── Risk level computation ────────────────────────────────

  private computeRiskLevel(
    score: number,
    issues: string[],
    lowerText: string,
    profile: ReturnType<typeof brandProfileService.get>
  ): ReviewRiskLevel {
    // Critical: legal/PR risk keywords or forbidden claims with financial promises
    const hasCriticalLegal = profile.legalRiskKeywords.some(k => lowerText.includes(k));
    const hasCriticalPR = profile.prRiskKeywords.filter(k => lowerText.includes(k)).length >= 2;
    if (hasCriticalLegal || hasCriticalPR) return 'critical';

    // High: forbidden claims, very low score, or financial promises without disclaimers
    const hasForbiddenClaim = profile.forbiddenClaims.some(c => lowerText.includes(c));
    if (hasForbiddenClaim || score < 40) return 'high';

    // Medium: moderate issues or score 40–70
    if (score < 70 || issues.filter(i => i.includes('Forbidden') || i.includes('Legal') || i.includes('PR risk')).length > 0) {
      return 'medium';
    }

    return 'low';
  }
}

export const contentReviewService = ContentReviewService.getInstance();
