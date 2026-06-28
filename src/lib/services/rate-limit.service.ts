import prisma from "@/lib/prisma";
import { isAdmin as checkAdmin } from "@/lib/auth";

export const DAILY_LINK_LIMIT = 10;

/**
 * Get the count of URLs created by a user today
 */
export async function getTodayUrlCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const count = await prisma.incidentReport.count({
    where: {
      reporterId: userId,
      createdAt: {
        gte: today,
      },
    },
  });
  
  return count;
}

/**
 * Get rate limit status for a user
 */
export async function getRateLimitStatus(user: { id: string; role: string }): Promise<{
  used: number;
  limit: number;
  remaining: number;
  isAdmin: boolean;
  resetAt: Date;
}> {
  const isAdminUser = checkAdmin(user);
  
  // Admin has no limit
  if (isAdminUser) {
    return {
      used: 0,
      limit: Infinity,
      remaining: Infinity,
      isAdmin: true,
      resetAt: getMidnight(),
    };
  }

  const used = await getTodayUrlCount(user.id);
  
  return {
    used,
    limit: DAILY_LINK_LIMIT,
    remaining: Math.max(0, DAILY_LINK_LIMIT - used),
    isAdmin: false,
    resetAt: getMidnight(),
  };
}

/**
 * Check if user can create more URLs
 */
export async function canCreateUrl(user: { id: string; role: string }): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const status = await getRateLimitStatus(user);
  
  return {
    allowed: status.isAdmin || status.remaining > 0,
    used: status.used,
    limit: status.isAdmin ? Infinity : status.limit,
    remaining: status.remaining,
  };
}

/**
 * Get midnight of tomorrow (reset time)
 */
function getMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

// ============ Client IP Rate Limiting ============

// In-memory store for IP-based rate limiting (for API abuse protection)
// Key: ip-hash -> { count: number, windowStart: timestamp }
const ipRateLimitStore = new Map<string, { count: number; windowStart: number }>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  for (const [key, value] of ipRateLimitStore) {
    if (now - value.windowStart > windowMs * 2) {
      ipRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const IP_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // max 30 requests per minute per IP
};

/**
 * Check IP-based rate limit for API abuse protection
 * Returns true if request is allowed, false if rate limited
 */
export function checkIpRateLimit(ipHash: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number; // milliseconds
} {
  const now = Date.now();
  const record = ipRateLimitStore.get(ipHash);

  // First request or window expired
  if (!record || now - record.windowStart > IP_RATE_LIMIT.windowMs) {
    ipRateLimitStore.set(ipHash, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: IP_RATE_LIMIT.maxRequests - 1,
      resetIn: IP_RATE_LIMIT.windowMs,
    };
  }

  // Within window
  if (record.count >= IP_RATE_LIMIT.maxRequests) {
    const resetIn = IP_RATE_LIMIT.windowMs - (now - record.windowStart);
    return {
      allowed: false,
      remaining: 0,
      resetIn,
    };
  }

  // Increment count
  record.count++;
  ipRateLimitStore.set(ipHash, record);
  
  return {
    allowed: true,
    remaining: IP_RATE_LIMIT.maxRequests - record.count,
    resetIn: IP_RATE_LIMIT.windowMs - (now - record.windowStart),
  };
}

/**
 * Get hash of IP address for privacy
 */
export function hashIp(ip: string): string {
  // Simple hash for rate limiting (not for security)
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `ip_${hash.toString(36)}`;
}
