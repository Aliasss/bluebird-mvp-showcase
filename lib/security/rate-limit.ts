type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
  remaining: number;
};

const globalStore = globalThis as typeof globalThis & {
  __bluebirdRateLimitStore?: Map<string, Bucket>;
};

const store = globalStore.__bluebirdRateLimitStore ?? new Map<string, Bucket>();
globalStore.__bluebirdRateLimitStore = store;

function nowMs() {
  return Date.now();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown-ip';
  }
  return request.headers.get('x-real-ip') || 'unknown-ip';
}

export function consumeRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = nowMs();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      retryAfterSec: Math.ceil(config.windowMs / 1000),
      remaining: Math.max(0, config.maxRequests - 1),
    };
  }

  if (current.count >= config.maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  current.count += 1;
  store.set(key, current);
  return {
    allowed: true,
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    remaining: Math.max(0, config.maxRequests - current.count),
  };
}
