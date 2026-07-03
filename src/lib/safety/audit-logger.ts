export type AuditEvent = {
  type:
    | "safety.validation"
    | "permission.check"
    | "approval.created"
    | "approval.approved"
    | "approval.rejected"
    | "tool.blocked"
    | "prompt.injection.detected";
  message: string;
  actor?: string;
  riskLevel?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

function maskSecrets(obj: unknown): unknown {
  if (typeof obj === "string") {
    if (/(sk-[a-zA-Z0-9]{10,}|ghp_[a-zA-Z0-9]{10,})/.test(obj)) {
      return "[REDACTED SECRET]";
    }
    return obj;
  }
  if (obj && typeof obj === "object") {
    const safeObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().includes("secret") || k.toLowerCase().includes("key") || k.toLowerCase().includes("token")) {
        safeObj[k] = "[REDACTED]";
      } else {
        safeObj[k] = maskSecrets(v);
      }
    }
    return safeObj;
  }
  return obj;
}

export function recordAuditEvent(event: AuditEvent): void {
  const safeEvent = {
    ...event,
    metadata: event.metadata ? maskSecrets(event.metadata) : undefined,
    createdAt: event.createdAt || new Date().toISOString()
  };

  // Safe stringify to handle circular deps
  let safeString = "";
  try {
    const cache = new Set();
    safeString = JSON.stringify(safeEvent, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    }, 2);
  } catch (e) {
    safeString = "[Error serializing audit event]";
  }

  console.log(`[AUDIT LOG] [${safeEvent.type}] ${safeEvent.message}\n`, safeString);
  
  // Future: persist to database
}
