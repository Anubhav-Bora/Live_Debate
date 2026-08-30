type RateLimitEntry = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  debateRateLimits?: Map<string, RateLimitEntry>;
};

const entries = globalForRateLimit.debateRateLimits ?? new Map<string, RateLimitEntry>();
if (process.env.NODE_ENV !== "production") globalForRateLimit.debateRateLimits = entries;

export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
