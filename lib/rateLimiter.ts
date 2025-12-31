/**
 * Rate Limiter for API Protection
 * Prevents abuse and DDoS attacks
 */

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  blockDuration?: number; // How long to block after limit exceeded (ms)
  keyGenerator?: (req: Request) => string; // Custom key generator
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked?: boolean;
  blockedUntil?: number;
}

// In-memory store (for serverless, use Redis/KV in production)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime && (!entry.blockedUntil || now > entry.blockedUntil)) {
      store.delete(key);
    }
  }
  lastCleanup = now;
}

/**
 * Default rate limit configurations for different endpoints
 */
export const RateLimitPresets = {
  // Standard API endpoints
  api: {
    windowMs: 60000,      // 1 minute
    maxRequests: 100,     // 100 requests per minute
    blockDuration: 60000, // Block for 1 minute after exceeding
  },

  // Authentication endpoints (stricter)
  auth: {
    windowMs: 300000,     // 5 minutes
    maxRequests: 10,      // 10 attempts per 5 minutes
    blockDuration: 900000, // Block for 15 minutes
  },

  // File uploads (very strict)
  upload: {
    windowMs: 60000,      // 1 minute
    maxRequests: 10,      // 10 uploads per minute
    blockDuration: 300000, // Block for 5 minutes
  },

  // QR code generation
  qrGenerate: {
    windowMs: 60000,      // 1 minute
    maxRequests: 30,      // 30 QR codes per minute
    blockDuration: 60000,
  },

  // QR code scanning (public)
  scan: {
    windowMs: 1000,       // 1 second
    maxRequests: 10,      // 10 scans per second
    blockDuration: 5000,  // Block for 5 seconds
  },

  // Password reset
  passwordReset: {
    windowMs: 3600000,    // 1 hour
    maxRequests: 3,       // 3 reset attempts per hour
    blockDuration: 3600000,
  },

  // Webhook delivery
  webhook: {
    windowMs: 60000,
    maxRequests: 100,
    blockDuration: 60000,
  },
};

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  // Check if blocked
  if (entry?.blocked && entry.blockedUntil && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    store.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
      blocked: false,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    // Block if configured
    if (config.blockDuration) {
      entry.blocked = true;
      entry.blockedUntil = now + config.blockDuration;
      store.set(key, entry);
    }

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockedUntil || entry.resetTime,
      retryAfter: Math.ceil(((entry.blockedUntil || entry.resetTime) - now) / 1000),
    };
  }

  // Increment count
  entry.count++;
  store.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Generate rate limit key from request
 */
export function getRateLimitKey(
  req: Request,
  prefix: string = 'rl'
): string {
  // Get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfIp = req.headers.get('cf-connecting-ip');

  const ip = cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';

  return `${prefix}:${ip}`;
}

/**
 * Generate rate limit key with user ID (for authenticated routes)
 */
export function getRateLimitKeyWithUser(
  req: Request,
  userId: string,
  prefix: string = 'rl'
): string {
  return `${prefix}:user:${userId}`;
}

/**
 * Rate limit middleware helper for API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : getRateLimitKey(req);

    const result = checkRateLimit(key, config);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter || 60),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          },
        }
      );
    }

    const response = await handler(req);

    // Add rate limit headers to response
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(config.maxRequests));
    headers.set('X-RateLimit-Remaining', String(result.remaining));
    headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Distributed rate limiter using Supabase (for production)
 * Call this from API routes that need persistent rate limiting
 */
export async function checkDistributedRateLimit(
  supabase: { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: boolean | null; error: Error | null }> },
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request but log error
      return { allowed: true };
    }

    return { allowed: data === true };
  } catch (err) {
    console.error('Rate limit exception:', err);
    return { allowed: true }; // Fail open
  }
}

export default {
  checkRateLimit,
  getRateLimitKey,
  getRateLimitKeyWithUser,
  withRateLimit,
  checkDistributedRateLimit,
  RateLimitPresets,
};
