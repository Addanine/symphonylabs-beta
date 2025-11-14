/**
 * Rate Limiter Implementation
 *
 * Provides rate limiting capabilities with configurable windows and limits.
 * Uses in-memory storage with automatic cleanup of expired entries.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
}

class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.store = new Map();
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if a request is allowed based on rate limit
   * @param key - Unique identifier (e.g., IP address, user ID)
   * @param config - Rate limit configuration
   * @returns Object with isAllowed flag and remaining requests
   */
  check(key: string, config: RateLimitConfig): {
    isAllowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const entry = this.store.get(key);

    // No entry exists or entry has expired
    if (!entry || now > entry.resetTime) {
      const resetTime = now + config.windowMs;
      this.store.set(key, {
        count: 1,
        resetTime,
      });

      return {
        isAllowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    // Entry exists and is still valid
    if (entry.count < config.maxRequests) {
      entry.count++;
      this.store.set(key, entry);

      return {
        isAllowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
      };
    }

    // Rate limit exceeded
    return {
      isAllowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Get the client identifier from request
   * Uses IP address and user agent for better uniqueness
   */
  getClientId(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    // Create a hash-like identifier
    return `${ip}:${userAgent.slice(0, 50)}`;
  }

  /**
   * Clean up expired entries from store
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Manually reset rate limit for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Get current rate limit status without incrementing
   */
  getStatus(key: string): RateLimitEntry | null {
    return this.store.get(key) ?? null;
  }

  /**
   * Destroy the rate limiter and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Common rate limit configurations
export const RateLimitPresets = {
  // Very strict for login attempts
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  // Strict for admin operations
  ADMIN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
  },
  // Moderate for order creation
  ORDER_CREATE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 6, // 6 orders per minute
  },
  // Standard for general API endpoints
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  // Generous for public read operations
  PUBLIC: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
} as const;
