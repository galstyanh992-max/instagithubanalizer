// ─── Agent OS — Cost Estimation Engine ───────────────────────
// Heuristic-based cost estimation without real billing.
// Future: integrate with actual token counting and provider pricing.

import type { CostEstimate, CostLevel, TaskSize } from './types';

// ─── Token/cost estimates by task size ───────────────────────

const SIZE_ESTIMATES: Record<TaskSize, { tokens: number; usd: number }> = {
  small: { tokens: 2_000, usd: 0.01 },
  medium: { tokens: 10_000, usd: 0.05 },
  large: { tokens: 50_000, usd: 0.25 },
  epic: { tokens: 200_000, usd: 1.0 },
};

// ─── Keywords that suggest higher cost ───────────────────────

const HIGH_COST_KEYWORDS: string[] = [
  'rag', 'vector', 'embedding', 'search index',
  'ocr', 'pdf', 'document processing', 'translation',
  'image generation', 'video', 'audio transcription',
  'training', 'fine-tuning', 'model',
  'batch processing', 'migration', 'mass',
  'full-stack', 'end-to-end', 'complete system',
  'crm', 'erp', 'platform',
];

const POTENTIALLY_HIGH_KEYWORDS: string[] = [
  'ai', 'ml', 'nlp', 'machine learning',
  'real-time', 'streaming', 'webhook',
  'integration', 'third-party', 'api',
  'multi-tenant', 'analytics', 'dashboard',
];

class CostEstimationEngine {
  private static instance: CostEstimationEngine | null = null;

  private constructor() {}

  static getInstance(): CostEstimationEngine {
    if (!CostEstimationEngine.instance) {
      CostEstimationEngine.instance = new CostEstimationEngine();
    }
    return CostEstimationEngine.instance;
  }

  /**
   * Estimate cost for a task based on size and message content
   */
  estimate(taskSize: TaskSize, message: string): CostEstimate {
    const baseEstimate = SIZE_ESTIMATES[taskSize];
    const messageLower = message.toLowerCase();
    const notes: string[] = [];

    let level: CostLevel = this.sizeToCostLevel(taskSize);

    // Check for high-cost keywords
    const matchedHigh = HIGH_COST_KEYWORDS.filter((kw) =>
      messageLower.includes(kw)
    );
    const matchedPotentially = POTENTIALLY_HIGH_KEYWORDS.filter((kw) =>
      messageLower.includes(kw)
    );

    if (matchedHigh.length > 0) {
      level = 'potentially_high';
      notes.push(
        `Detected high-cost patterns: ${matchedHigh.join(', ')}`
      );
      notes.push(
        'These features typically require significant AI processing or complex implementation'
      );
    } else if (matchedPotentially.length > 0 && level !== 'low') {
      if (level === 'medium') {
        level = 'high';
      }
      notes.push(
        `Potentially costly patterns detected: ${matchedPotentially.join(', ')}`
      );
    }

    // Adjust token estimates for high-cost items
    let estimatedTokens = baseEstimate.tokens;
    let estimatedUsd = baseEstimate.usd;

    if (level === 'potentially_high') {
      estimatedTokens = Math.max(estimatedTokens, 100_000);
      estimatedUsd = Math.max(estimatedUsd, 0.5);
    } else if (level === 'high') {
      estimatedTokens = Math.max(estimatedTokens, 50_000);
      estimatedUsd = Math.max(estimatedUsd, 0.25);
    }

    // Count subtask indicators to estimate scope
    const subtaskCount = this.countSubtaskIndicators(message);
    if (subtaskCount > 3) {
      estimatedTokens = Math.round(estimatedTokens * 1.5);
      estimatedUsd = Math.round(estimatedUsd * 100 * 1.5) / 100;
      notes.push(`Task has ${subtaskCount}+ implicit subtasks — cost multiplied`);
    }

    if (notes.length === 0) {
      notes.push(`Base estimate for ${taskSize} task`);
    }

    return {
      level,
      estimatedTokens,
      estimatedUsd,
      notes,
    };
  }

  /**
   * Map task size to cost level
   */
  private sizeToCostLevel(size: TaskSize): CostLevel {
    switch (size) {
      case 'small':
        return 'low';
      case 'medium':
        return 'medium';
      case 'large':
        return 'high';
      case 'epic':
        return 'high';
    }
  }

  /**
   * Count implicit subtask indicators in message
   */
  private countSubtaskIndicators(message: string): number {
    const indicators = [
      /\band\b/gi,
      /\bthen\b/gi,
      /\balso\b/gi,
      /\bplus\b/gi,
      /\bafter\b/gi,
      /\binclude\b/gi,
      /\bwith\b/gi,
    ];
    let count = 0;
    for (const pattern of indicators) {
      const matches = message.match(pattern);
      if (matches) count += matches.length;
    }
    return count;
  }
}

export const costEstimationEngine = CostEstimationEngine.getInstance();
