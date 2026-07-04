export type ActorRole = "owner" | "admin" | "agent" | "viewer" | "system";

export type ActorSource = "web" | "telegram" | "api" | "system" | "agent";

export interface SafetyActor {
  id: string;
  role: ActorRole;
  source: ActorSource;
  workspaceId?: string;
  agentId?: string;
  /** True if a per-tool permission grant exists for the requested action. */
  hasToolPermission?: boolean;
}

/** Unknown/unauthenticated actor — used as fail-closed default. */
export const UNKNOWN_ACTOR: SafetyActor = {
  id: "unknown",
  role: "viewer",
  source: "api",
};

/**
 * Normalize any loosely-typed actor input into a SafetyActor.
 * Anything unrecognized collapses to an unknown viewer (fail closed).
 */
export function normalizeActor(input?: Partial<SafetyActor> | string | null): SafetyActor {
  if (!input) return { ...UNKNOWN_ACTOR };
  if (typeof input === "string") {
    if (input === "system") return { id: "system", role: "system", source: "system" };
    return { ...UNKNOWN_ACTOR, id: input };
  }
  const roles: ActorRole[] = ["owner", "admin", "agent", "viewer", "system"];
  const sources: ActorSource[] = ["web", "telegram", "api", "system", "agent"];
  const role = roles.includes(input.role as ActorRole) ? (input.role as ActorRole) : "viewer";
  const source = sources.includes(input.source as ActorSource) ? (input.source as ActorSource) : "api";
  return {
    id: input.id || "unknown",
    role,
    source,
    workspaceId: input.workspaceId,
    agentId: input.agentId,
    hasToolPermission: input.hasToolPermission,
  };
}

export function isUnknownActor(actor: SafetyActor): boolean {
  return actor.id === "unknown" || !actor.id;
}
