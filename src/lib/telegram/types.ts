export type TelegramCommand =
  | "status" | "help" | "approve" | "reject" | "reports" | "github_report" | "route_command" | "unknown";

export interface TelegramUserContext {
  telegramUserId: string;
  username?: string;
  isAllowed: boolean;
}

export interface TelegramMessageInput {
  text: string;
  chatId: string;
  user: TelegramUserContext;
}

export type TelegramNextAction =
  | "respond" | "route_to_command_router" | "approve_action" | "reject_action" | "deny" | "clarify";

export interface TelegramCommandResult {
  command: TelegramCommand;
  allowed: boolean;
  requiresApproval: boolean;
  message: string;
  approvalId?: string;
  routedIntent?: string;
  nextAction: TelegramNextAction;
  data?: Record<string, unknown>;
}
