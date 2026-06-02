/**
 * Rate limiter for server-side use in Next.js server actions.
 *
 * **Production:** Uses Upstash Redis + @upstash/ratelimit for global enforcement
 * across all serverless instances. Requires env vars:
 *   - UPSTASH_REDIS_REST_URL
 *   - UPSTASH_REDIS_REST_TOKEN
 *
 * **Development / fallback:** Falls back to an in-memory store when Upstash env
 * vars are absent. The in-memory store is per-process and is not suitable for
 * distributed deployments.
 *
 * Windows used:
 *   - Short window: 15 minutes  → 5 hits per IP (burst protection)
 *   - Daily window: 24 hours    → 20 hits per IP
 *   - Per-email-vacancy: 24 h   → 3 hits (duplicate spam)
 */

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

type HitRecord = {
  count: number;
  windowStart: number; // ms timestamp
};

const store = new Map<string, HitRecord>();
let lastCleanup = 0;

const SHORT_WINDOW_MS = 15 * 60 * 1000; // 15 min
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 min

function inMemoryHit(key: string, windowMs: number, maxHits: number): boolean {
  maybeClean();
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return true; // allowed
  }

  if (existing.count >= maxHits) {
    return false; // rate limited
  }

  existing.count += 1;
  return true; // allowed
}

function maybeClean() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of store.entries()) {
    if (now - record.windowStart > DAILY_WINDOW_MS) {
      store.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Upstash-backed limiters (lazy-initialised)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _upstashIpShort: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _upstashIpDaily: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _upstashEmailVacancy: any = null;
let _upstashInitialised = false;

function hasUpstashConfig(): boolean {
  return (
    typeof process.env.UPSTASH_REDIS_REST_URL === "string" &&
    process.env.UPSTASH_REDIS_REST_URL.length > 0 &&
    typeof process.env.UPSTASH_REDIS_REST_TOKEN === "string" &&
    process.env.UPSTASH_REDIS_REST_TOKEN.length > 0
  );
}

async function initUpstash() {
  if (_upstashInitialised) return;
  _upstashInitialised = true;
  if (!hasUpstashConfig()) return;

  try {
    const [{ Redis }, { Ratelimit }] = await Promise.all([
      import("@upstash/redis"),
      import("@upstash/ratelimit"),
    ]);
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    _upstashIpShort = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: "rl:ip:short",
    });
    _upstashIpDaily = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "24 h"),
      prefix: "rl:ip:daily",
    });
    _upstashEmailVacancy = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "24 h"),
      prefix: "rl:ev",
    });
  } catch {
    // Gracefully degrade to in-memory if Upstash import fails.
    _upstashIpShort = null;
    _upstashIpDaily = null;
    _upstashEmailVacancy = null;
  }
}

// ---------------------------------------------------------------------------
// Production guard
// ---------------------------------------------------------------------------

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * In production the in-memory fallback is unsafe: it is per-process and cannot
 * enforce limits across serverless instances, so an attacker can evade it by
 * hitting different cold starts. When Upstash is not configured we therefore
 * **fail closed** (treat every request as rate-limited) and log a redacted,
 * PII-free configuration error rather than silently degrading.
 *
 * The message is a static operational string with no user data, so it is safe
 * to log verbatim.
 */
function denyDueToMissingDistributedLimiter(): boolean {
  console.error(
    "rate_limiter_misconfigured: UPSTASH_REDIS_REST_URL/TOKEN must be set in production",
  );
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if the request is allowed; false if rate limited.
 * Checks both the 15-minute burst window and the 24-hour daily window.
 */
export async function checkIpRateLimit(ip: string): Promise<boolean> {
  await initUpstash();

  if (_upstashIpShort && _upstashIpDaily) {
    const [short, daily] = await Promise.all([
      _upstashIpShort.limit(ip) as Promise<{ success: boolean }>,
      _upstashIpDaily.limit(ip) as Promise<{ success: boolean }>,
    ]);
    return short.success && daily.success;
  }

  // No distributed limiter available.
  if (IS_PRODUCTION) {
    return denyDueToMissingDistributedLimiter();
  }

  // In-memory fallback (development only).
  const shortOk = inMemoryHit(`ip:short:${ip}`, SHORT_WINDOW_MS, 5);
  const dailyOk = inMemoryHit(`ip:daily:${ip}`, DAILY_WINDOW_MS, 20);
  return shortOk && dailyOk;
}

/**
 * Returns true if allowed; false if this email+vacancy combination has
 * been submitted too many times within 24 hours.
 */
export async function checkEmailVacancyRateLimit(
  email: string,
  vacancySlug: string,
): Promise<boolean> {
  await initUpstash();

  const key = `${email.toLowerCase()}:${vacancySlug}`;

  if (_upstashEmailVacancy) {
    const result = await (_upstashEmailVacancy.limit(key) as Promise<{
      success: boolean;
    }>);
    return result.success;
  }

  // No distributed limiter available.
  if (IS_PRODUCTION) {
    return denyDueToMissingDistributedLimiter();
  }

  // In-memory fallback (development only).
  return inMemoryHit(`email-vacancy:${key}`, DAILY_WINDOW_MS, 3);
}
