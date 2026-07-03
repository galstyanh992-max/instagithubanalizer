// src/lib/rate-limit/index.ts
// Rate limiting for LLM-calling API routes.
//
// Strategy (in priority order):
//   1. @upstash/ratelimit + @upstash/redis  — if UPSTASH_REDIS_REST_URL is set
//      Durable, shared across instances, survives restarts.
//   2. In-memory token bucket (fallback)    — no env vars required
//      ⚠ Single-instance only: does not share state across multiple Node
//      processes or between restarts. Suitable for single-server deploys.
//      Do NOT rely on this for multi-process or distributed deployments.
//
// Key: NextAuth session sub (email) from JWT → fallback to client IP.
// Returns 429 with Retry-After header on limit exceeded.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { loggers } from '@/lib/logger';

// ── Limit definitions ─────────────────────────────────────────

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  requests: number;
  /** Window duration in seconds */
  windowSec: number;
}

// Per-route limits (applied per key = user or IP)
export const RATE_LIMITS = {
  // AI / LLM routes — expensive, strict
  ai:           { requests: 20,  windowSec: 60  },
  // Orchestrator — each request may fan out to multiple LLM calls
  orchestrator: { requests: 30,  windowSec: 60  },
  // Tool execute — can trigger side effects
  tools:        { requests: 60,  windowSec: 60  },
  // Default for any other protected route
  default:      { requests: 120, windowSec: 60  },
} satisfies Record<string, RateLimitConfig>;

// ── Key extraction ────────────────────────────────────────────

/** Build a rate-limit key: prefer session sub, fallback to IP */
async function buildKey(request: NextRequest, prefix: string): Promise<string> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const identity = token?.sub ?? token?.email ?? extractIp(request) ?? 'unknown';
  return `rl:${prefix}:${identity}`;
}

function extractIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    // Next.js 13+ exposes req.ip via the runtime
    (req as unknown as { ip?: string }).ip ??
    null
  );
}

// ── 429 response helper ───────────────────────────────────────

function tooManyRequests(retryAfterSec: number, limit: number): NextResponse {
  return NextResponse.json(
    { error: 'Too Many Requests', retryAfter: retryAfterSec },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(limit),
      },
    }
  );
}

// ── Upstash implementation ────────────────────────────────────

let upstashLimiter: UpstashLimiter | null = null;

async function tryInitUpstash(): Promise<UpstashLimiter | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  try {
    const { Redis } = await import('@upstash/redis');
    const { Ratelimit } = await import('@upstash/ratelimit');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return new UpstashLimiter(redis, Ratelimit);
  } catch {
    loggers.rateLimit.warn('[RateLimit] Upstash init failed — falling back to in-memory');
    return null;
  }
}

class UpstashLimiter {
  private limiters = new Map<string, unknown>();

  constructor(
    private redis: unknown,
    private Ratelimit: any
  ) {}

  private getLimiter(cfg: RateLimitConfig) {
    const key = `${cfg.requests}/${cfg.windowSec}`;
    if (!this.limiters.has(key)) {
      this.limiters.set(
        key,
        new this.Ratelimit({
          redis: this.redis,
          limiter: this.Ratelimit.slidingWindow(cfg.requests, `${cfg.windowSec}s`),
          prefix: 'agent-os',
        })
      );
    }
    return this.limiters.get(key) as { limit: (key: string) => Promise<{ success: boolean; reset: number }> };
  }

  async check(key: string, cfg: RateLimitConfig): Promise<{ allowed: boolean; retryAfterSec: number }> {
    const limiter = this.getLimiter(cfg);
    const result = await limiter.limit(key);
    const retryAfterSec = result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000);
    return { allowed: result.success, retryAfterSec };
  }
}

// ── In-memory token bucket (fallback) ────────────────────────
//
// ⚠ SINGLE-INSTANCE LIMITATION: This counter Map lives in the Node.js
// module cache. It is NOT shared between multiple processes (pm2 cluster,
// multi-container, etc.) and resets on every server restart.
// For production multi-instance deploys, set UPSTASH_REDIS_REST_URL.

interface Bucket {
  tokens: number;
  lastRefill: number; // ms epoch
}

const buckets = new Map<string, Bucket>();

function checkInMemory(key: string, cfg: RateLimitConfig): { allowed: boolean; retryAfterSec: number } {
  const nowMs = Date.now();
  const windowMs = cfg.windowSec * 1000;
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: cfg.requests - 1, lastRefill: nowMs };
    buckets.set(key, bucket);
    return { allowed: true, retryAfterSec: 0 };
  }

  // Refill tokens proportional to elapsed time (token bucket algorithm)
  const elapsed = nowMs - bucket.lastRefill;
  const refill = Math.floor((elapsed / windowMs) * cfg.requests);
  if (refill > 0) {
    bucket.tokens = Math.min(cfg.requests, bucket.tokens + refill);
    bucket.lastRefill = nowMs;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return { allowed: true, retryAfterSec: 0 };
  }

  // Depleted — estimate refill time
  const retryAfterSec = Math.ceil((windowMs - elapsed) / 1000);
  return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
}

// Periodic cleanup to prevent unbounded Map growth
// (runs every 10 minutes, removes buckets inactive for >2 windows)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      // Find the config for this key — use conservative max window (120s)
      const maxWindowMs = 120_000;
      if (now - bucket.lastRefill > maxWindowMs * 2) {
        buckets.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

// ── Public API ────────────────────────────────────────────────

let initialized = false;

async function ensureInit() {
  if (initialized) return;
  initialized = true;
  upstashLimiter = await tryInitUpstash();
  if (upstashLimiter) {
    loggers.rateLimit.info('[RateLimit] Using Upstash Redis sliding window');
  } else {
    loggers.rateLimit.info('[RateLimit] Using in-memory token bucket (single-instance)');
  }
}

/**
 * Check rate limit for a request.
 * Returns a 429 NextResponse if limited, null if allowed.
 *
 * @param request - The incoming NextRequest
 * @param prefix  - Bucket namespace (e.g. 'orchestrator', 'ai', 'tools')
 * @param cfg     - Limit config (requests per windowSec)
 */
export async function rateLimit(
  request: NextRequest,
  prefix: string,
  cfg: RateLimitConfig
): Promise<NextResponse | null> {
  await ensureInit();

  const key = await buildKey(request, prefix);

  let allowed: boolean;
  let retryAfterSec: number;

  if (upstashLimiter) {
    ({ allowed, retryAfterSec } = await upstashLimiter.check(key, cfg));
  } else {
    ({ allowed, retryAfterSec } = checkInMemory(key, cfg));
  }

  if (!allowed) return tooManyRequests(retryAfterSec, cfg.requests);
  return null;
}
