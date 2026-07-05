/**
 * Phone UI Bridge — public surface.
 *
 * FOUNDATION ONLY. Read/preview DTOs for a phone (mobile web / Telegram) client.
 * No command execution, no message sending, no external API calls, no secrets,
 * and no live DB requirement. All remote actions resolve to plan / approval /
 * blocked / not-implemented / local-agent-not-running.
 */

export * from "./types";
export { buildPhoneBridgeDashboard } from "./dashboard";
export { previewPhoneCommand } from "./command-preview";
export { buildPhoneApprovalInbox } from "./approval-inbox";
