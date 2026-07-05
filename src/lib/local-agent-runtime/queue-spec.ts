export interface LocalAgentQueueSpec {
  states: string[];
  transitions: string[];
  retryPolicy: string[];
  timeoutPolicy: string[];
  resultReporting: string[];
  idempotency: string[];
  audit: string[];
  boundary: string[];
}

/** Pure spec — no real queue/worker created. */
export function buildLocalAgentQueueSpec(): LocalAgentQueueSpec {
  return {
    states: ["draft", "queued", "approval_required", "approved", "rejected", "blocked", "executed_mock", "failed"],
    transitions: [
      "draft → queued (submitted)",
      "queued → approval_required (risk >= MEDIUM or write/terminal/bridge capability)",
      "approval_required → approved | rejected (owner decision)",
      "approved → executed_mock (future: real execution once local agent exists)",
      "any → blocked (safety/terminal-guard/workspace-policy denial)",
      "executed_mock → failed (future: real execution error)",
    ],
    retryPolicy: ["Max 1 retry planned for transient failures (future).", "No automatic retry for denied/blocked items."],
    timeoutPolicy: ["Queued items expire after a configurable TTL (future, not implemented).", "Approval requests expire per existing ApprovalRequest policy."],
    resultReporting: ["Result recorded to Project Brain as action_result (non-fatal).", "No result implies LOCAL_AGENT_NOT_RUNNING."],
    idempotency: ["Each envelope has a unique id; re-submission with same id is a no-op (future)."],
    audit: ["Every transition logged via safety audit-logger.", "Actor/source/reason always included."],
    boundary: ["Execution is strictly local-only, inside AGENT_WORKSPACE_ROOT.", "No queue item may cross workspace boundary."],
  };
}
