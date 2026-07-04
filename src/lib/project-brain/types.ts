export type BrainEntryType =
  | "user_command"
  | "router_decision"
  | "safety_decision"
  | "approval_event"
  | "action_result"
  | "error"
  | "user_preference"
  | "project_decision"
  | "daily_note"
  | "research_note"
  | "api_reference"
  | "tool_reference"
  | "agent_reference";

export type BrainImportance = "low" | "medium" | "high" | "critical";

export interface BrainEntryInput {
  type: BrainEntryType;
  title: string;
  content: string;
  actorId?: string;
  actorRole?: string;
  actorSource?: string;
  workspaceId?: string;
  projectId?: string;
  agentId?: string;
  tags?: string[];
  importance?: BrainImportance;
  sensitive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BrainEntry {
  id: string;
  type: BrainEntryType;
  title: string;
  content: string;
  tags: string[];
  sensitive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Public projection — never exposes content of sensitive entries. */
export interface BrainEntryPublic {
  id: string;
  type: BrainEntryType;
  title: string;
  content: string;
  tags: string[];
  sensitive: boolean;
  createdAt: string;
}

export interface BrainAdapter {
  save(input: BrainEntryInput): Promise<BrainEntry>;
  list(limit: number): Promise<BrainEntry[]>;
  search(query: string, limit: number): Promise<BrainEntry[]>;
}
