// Daemon-side Policy Engine gate for remote capability commands. Genuinely
// reuses the existing, generic permission primitive
// (src/lib/safety/permission-checker.ts's checkPermission) rather than
// building a second, parallel "brain" — that function is pure (no I/O,
// actor/risk matrix only) and, per the runtime-boundary scan (see
// scripts/check-runtime-boundary.mjs), never touches a local resource, so
// importing it into the daemon process is safe and does not duplicate logic.
//
// The daemon is a single-owner execution host: every remote command it can
// ever see originated from an AgentTask created by
// POST /api/devices/[id]/commands, which is itself gated by
// requireJarvisOwner() (Supabase-session-authenticated, must be
// JARVIS_OWNER_ID). There is no multi-tenant actor model to resolve here —
// the daemon always evaluates permission as the owner acting through their
// own automation, which is exactly checkPermission's `role: "owner"` path.
import { checkPermission, type PermissionCheckResult, type RiskLevel } from '@/lib/safety/permission-checker';
import { findCapabilityOperation, type CapabilityCommandEnvelope } from '@/lib/jarvis/capabilities/envelope';

export interface PolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}

export function evaluateCapabilityPolicy(envelope: CapabilityCommandEnvelope): PolicyDecision {
  const definition = findCapabilityOperation(envelope.capability, envelope.operation);
  if (!definition) {
    // Fail closed: an operation not in the explicit catalog (envelope.ts)
    // is never executed, regardless of what the request claims — this is
    // the "no six hard-coded brains, but also no unbounded surface" rule.
    return { allowed: false, requiresApproval: false, reason: `Операция не входит в утверждённый каталог возможностей: ${envelope.capability}.${envelope.operation}` };
  }

  // Explicit id required: normalizeActor() treats a missing/empty id as
  // "unknown" (fail-closed) regardless of role, per src/lib/safety/actor.ts.
  const result: PermissionCheckResult = checkPermission({
    action: `${envelope.capability}.${envelope.operation}`,
    riskLevel: definition.riskLevel as RiskLevel,
    actor: { id: 'jarvis-daemon', role: 'owner', source: 'agent' },
  });

  return { allowed: result.allowed, requiresApproval: result.requiresApproval, reason: result.reason };
}
