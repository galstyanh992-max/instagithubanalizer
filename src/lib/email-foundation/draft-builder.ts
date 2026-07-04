import type { EmailDraftInput, EmailDraftResult } from "./types";
import { classifyEmailIntent, isUnsafeEmailRequest, containsSecretLike } from "./email-intent";
import { recordBrainEntry } from "@/lib/project-brain/project-brain-service";

/** Never sends, never connects to a mailbox. Draft only. */
export async function buildEmailDraft(input: EmailDraftInput): Promise<EmailDraftResult> {
  const intent = classifyEmailIntent(input.text);

  const unsafe = isUnsafeEmailRequest(input.text);
  if (unsafe.unsafe) {
    void recordBrainEntry({ type: "safety_decision", title: "email request denied", content: input.text, importance: "high", metadata: { reason: unsafe.reason } });
    return { intent, allowed: false, requiresApproval: false, blockedReasons: [unsafe.reason ?? "unsafe"], nextAction: "deny" };
  }

  if (containsSecretLike(input.text)) {
    return { intent, allowed: false, requiresApproval: false, blockedReasons: ["Текст содержит похожее на секрет значение — отклонено."], nextAction: "deny" };
  }

  if (intent === "unknown") {
    return { intent, allowed: false, requiresApproval: false, blockedReasons: [], nextAction: "clarify" };
  }

  if (intent === "send_email") {
    void recordBrainEntry({ type: "action_result", title: "email send requested", content: input.text, importance: "high", metadata: { intent, requiresApproval: true } });
    return { intent, allowed: false, requiresApproval: true, blockedReasons: [], nextAction: "request_approval" };
  }

  if ((intent === "draft_email" || intent === "reply_email") && !input.recipientHint) {
    return { intent, allowed: false, requiresApproval: false, blockedReasons: [], nextAction: "clarify" };
  }

  const subject = input.subjectHint ?? `Re: ${input.text.slice(0, 40)}`;
  const body = `Здравствуйте${input.recipientHint ? `, ${input.recipientHint}` : ""},\n\n${input.text}\n\nС уважением.`;

  const result: EmailDraftResult = {
    intent, allowed: true, requiresApproval: intent === "reply_email" || intent === "draft_email",
    subject, body,
    summary: intent === "summarize_email" ? input.text.slice(0, 200) : undefined,
    actionItems: intent === "extract_action_items" ? input.text.split(/[.!?]/).filter((s) => s.trim()).slice(0, 5) : undefined,
    blockedReasons: [], nextAction: "show_draft",
  };

  void recordBrainEntry({
    type: "action_result", title: `email draft: ${intent}`, content: subject,
    actorId: input.actorId, importance: "medium", metadata: { intent, recipientHint: input.recipientHint },
  });

  return result;
}
