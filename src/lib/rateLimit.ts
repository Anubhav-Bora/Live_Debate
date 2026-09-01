type RateLimitEntry = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  debateRateLimits?: Map<string, RateLimitEntry>;
  debateRateLimitLastSweep?: number;
};

const entries = globalForRateLimit.debateRateLimits ?? new Map<string, RateLimitEntry>();
globalForRateLimit.debateRateLimits = entries;

function sweepExpiredEntries(now: number) {
  const lastSweep = globalForRateLimit.debateRateLimitLastSweep ?? 0;
  if (entries.size < 1_000 && now - lastSweep < 60_000) return;
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }
  while (entries.size > 20_000) {
    const oldestKey = entries.keys().next().value as string | undefined;
    if (!oldestKey) break;
    entries.delete(oldestKey);
  }
  globalForRateLimit.debateRateLimitLastSweep = now;
}

export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweepExpiredEntries(now);
  const current = entries.get(key);
  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
