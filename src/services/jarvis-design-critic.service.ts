// ─── JARVIS Design Critic Loop ──────────────────────────────
// Multi-model design review:
//   1. Designer (GLM 5.2) generates initial design proposal
//   2. Design Critic (GPT-5.5 Thinking) audits and gives feedback
//   3. Designer (GLM 5.2) improves based on critique
//   4. Optional: repeat N rounds until critic approves or max rounds reached

import 'server-only';

import { jarvisRoleRouter } from './jarvis-role-router.service';
import type { ChatMessage } from '@/lib/ai-provider/types';

export interface DesignProposal {
  /** Initial design brief from user */
  brief: string;
  /** Project context (existing code, design system, etc.) */
  context?: string;
  /** Number of critique-improve rounds */
  rounds: number;
  /** Final design proposal */
  finalProposal: string;
  /** Critique history from each round */
  critiques: DesignCritique[];
  /** Whether the critic approved the final proposal */
  approved: boolean;
  /** Total latency in ms */
  latencyMs: number;
}

export interface DesignCritique {
  round: number;
  proposal: string;
  critique: string;
  /** "approved" | "needs_improvement" | "rejected" */
  verdict: 'approved' | 'needs_improvement' | 'rejected';
  /** Specific improvement points */
  improvements: string[];
}

class DesignCriticService {
  /**
   * Run the full design critic loop.
   * @param brief User's design brief
   * @param context Optional project context
   * @param maxRounds Maximum critique-improve iterations (default 2)
   */
  async runDesignLoop(
    brief: string,
    context?: string,
    maxRounds = 2,
  ): Promise<DesignProposal> {
    const startTime = Date.now();
    const critiques: DesignCritique[] = [];
    let currentProposal = '';
    let approved = false;

    // Step 1: Designer generates initial proposal
    const designerResponse = await jarvisRoleRouter.delegateToSpecialist(
      'designer',
      `Generate a detailed design proposal for the following brief. Include:
- Visual direction (colors, typography, mood)
- Layout structure
- Component hierarchy
- Interaction patterns
- Why this design is premium and not generic

BRIEF:
${brief}`,
      context,
    );
    currentProposal = designerResponse.content;

    // Steps 2-N: Critique + improve loop
    for (let round = 1; round <= maxRounds; round++) {
      // Critic audits the proposal
      const criticResponse = await jarvisRoleRouter.chat({
        role: 'design_critic',
        systemPrompt: `You are the JARVIS Design Critic. Audit the design proposal and identify:
- What looks generic or template-like
- What can be improved
- What can be made more premium
- Specific actionable changes

Respond in JSON:
{
  "verdict": "approved" | "needs_improvement" | "rejected",
  "improvements": ["specific change 1", "specific change 2", ...],
  "critique": "detailed critique text"
}`,
        userPrompt: `DESIGN BRIEF:
${brief}

CURRENT PROPOSAL:
${currentProposal}`,
        temperature: 0.4,
        maxTokens: 2048,
      });

      let critique: DesignCritique;
      try {
        const parsed = JSON.parse(criticResponse.content);
        critique = {
          round,
          proposal: currentProposal,
          critique: String(parsed.critique ?? criticResponse.content),
          verdict: (String(parsed.verdict ?? 'needs_improvement') as DesignCritique['verdict']),
          improvements: Array.isArray(parsed.improvements)
            ? parsed.improvements.map(String)
            : [],
        };
      } catch {
        critique = {
          round,
          proposal: currentProposal,
          critique: criticResponse.content,
          verdict: 'needs_improvement',
          improvements: [],
        };
      }
      critiques.push(critique);

      if (critique.verdict === 'approved') {
        approved = true;
        break;
      }

      // If not the last round, ask designer to improve
      if (round < maxRounds) {
        const history: ChatMessage[] = [
          { role: 'assistant', content: currentProposal },
        ];
        const improvedResponse = await jarvisRoleRouter.delegateToSpecialist(
          'designer',
          `Improve your previous design proposal based on the critic's feedback.

CRITIC FEEDBACK:
${critique.critique}

SPECIFIC IMPROVEMENTS NEEDED:
${critique.improvements.map((i) => `- ${i}`).join('\n')}

Provide an updated, more premium design proposal.`,
          context,
          history,
        );
        currentProposal = improvedResponse.content;
      }
    }

    return {
      brief,
      context,
      rounds: critiques.length,
      finalProposal: currentProposal,
      critiques,
      approved,
      latencyMs: Date.now() - startTime,
    };
  }
}

export const designCriticService = new DesignCriticService();