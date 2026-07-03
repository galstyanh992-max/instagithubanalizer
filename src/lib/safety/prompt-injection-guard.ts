export type PromptInjectionResult = {
  detected: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  matches: string[];
  sanitizedPrompt: string;
};

const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /reveal secrets/i,
  /print env/i,
  /show \.env/i,
  /disable safety/i,
  /bypass approval/i,
  /exfiltrate token/i,
  /send keys/i,
  /system prompt/i,
  /developer message/i,
  /run command/i,
  /delete files/i,
  /remove-item/i,
  /rm -rf/i
];

export function detectPromptInjection(input: string): PromptInjectionResult {
  const matches: string[] = [];
  let sanitizedPrompt = input;
  let detected = false;
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detected = true;
      riskLevel = "CRITICAL";
      matches.push(pattern.source);
      sanitizedPrompt = sanitizedPrompt.replace(new RegExp(pattern, "gi"), "[ЗАБЛОКИРОВАНО]");
    }
  }

  return {
    detected,
    riskLevel,
    matches,
    sanitizedPrompt
  };
}
