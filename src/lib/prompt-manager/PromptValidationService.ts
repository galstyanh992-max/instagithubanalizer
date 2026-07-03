export interface ValidationResult {
  status: 'PASS' | 'WARNING' | 'FAIL';
  score: number;
  messages: Array<{ level: 'info' | 'warning' | 'error'; text: string }>;
}

export class PromptValidationService {
  static validate(
    systemPrompt: string | null,
    developerPrompt: string | null,
    userPrompt: string | null,
    provider: string | null
  ): ValidationResult {
    let score = 100;
    const messages: Array<{ level: 'info' | 'warning' | 'error'; text: string }> = [];
    
    const sys = systemPrompt || '';
    const dev = developerPrompt || '';
    const usr = userPrompt || '';
    const combined = sys + dev + usr;

    // Common Checks
    if (!sys && !dev && !usr) {
      return { status: 'FAIL', score: 0, messages: [{ level: 'error', text: 'Prompt pack is entirely empty.' }] };
    }

    if (combined.length > 50000) {
      messages.push({ level: 'warning', text: 'Prompt is very long (>50k chars). Risk of token overflow.' });
      score -= 10;
    }

    if (/(ignore all previous instructions|system prompt leak|disregard safety)/i.test(combined)) {
      messages.push({ level: 'error', text: 'High risk of Prompt Injection or Jailbreak phrases detected.' });
      score -= 30;
    }

    // Provider Specific Checks
    if (provider === 'claude' || provider === 'claude_code') {
      if (!/<[a-z0-9_-]+>/i.test(combined)) {
        messages.push({ level: 'warning', text: 'Claude models perform better with explicit XML tags.' });
        score -= 15;
      }
    }

    if (provider === 'openai') {
      if (sys && !dev) {
        messages.push({ level: 'warning', text: 'OpenAI o1+ models prioritize Developer Prompt over System Prompt.' });
        score -= 10;
      }
    }

    if (provider === 'gemini') {
      if (!/step 1|first,|secondly,|finally/i.test(combined)) {
        messages.push({ level: 'info', text: 'Gemini responds well to explicit sequential step instructions.' });
      }
    }

    // Determine Status
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
    if (messages.some(m => m.level === 'error') || score < 60) {
      status = 'FAIL';
    } else if (messages.some(m => m.level === 'warning') || score < 90) {
      status = 'WARNING';
    }

    return { status, score, messages };
  }
}
