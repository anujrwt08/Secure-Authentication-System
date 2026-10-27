import prisma from './prisma';
import { NextRequest } from 'next/server';

// Configuration
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 5;       // 5 requests per minute per IP

// In-Memory Rate Limiting Storage
interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

export function checkIpRateLimit(
  ip: string,
  prefix: string = 'login',
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = RATE_LIMIT_WINDOW_MS
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const key = `${prefix}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { timestamps: [] };

  // Filter timestamps within the current sliding window
  entry.timestamps = entry.timestamps.filter((time) => now - time < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldestTimestamp = entry.timestamps[0];
    const resetInSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    };
  }

  // Record this request
  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);

  const remaining = maxRequests - entry.timestamps.length;
  return {
    allowed: true,
    remaining,
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}

// Reset IP rate limit (useful for admin/demo testing)
export function resetIpRateLimit(ip: string, prefix: string = 'login') {
  rateLimitStore.delete(`${prefix}:${ip}`);
}

// Reset ALL IP rate limits with a single click
export function resetAllRateLimits() {
  rateLimitStore.clear();
}

// ==========================================
// Account Lockout Protections
// ==========================================

export async function checkAccountLockout(username: string): Promise<{
  isLocked: boolean;
  lockedUntil?: Date;
  remainingSeconds: number;
  failedAttempts: number;
}> {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { failedAttempts: true, lockedUntil: true },
  });

  if (!user) {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
  }

  const now = new Date();

  // If lockout duration has elapsed, automatically unlock the account
  if (user.lockedUntil) {
    if (user.lockedUntil > now) {
      const remainingSeconds = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000);
      return {
        isLocked: true,
        lockedUntil: user.lockedUntil,
        remainingSeconds,
        failedAttempts: user.failedAttempts,
      };
    } else {
      // Auto-unlock
      await prisma.user.update({
        where: { username: username.toLowerCase() },
        data: { failedAttempts: 0, lockedUntil: null },
      });
      return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
    }
  }

  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: user.failedAttempts,
  };
}

export async function recordFailedLogin(username: string): Promise<{
  isLocked: boolean;
  failedAttempts: number;
  remainingAttempts: number;
  lockedUntil?: Date;
}> {
  const lowerUser = username.toLowerCase();
  const user = await prisma.user.findUnique({ where: { username: lowerUser } });
  if (!user) {
    return { isLocked: false, failedAttempts: 0, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }

  const newAttempts = user.failedAttempts + 1;
  const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    : null;

  await prisma.user.update({
    where: { username: lowerUser },
    data: {
      failedAttempts: newAttempts,
      lockedUntil: shouldLock ? lockedUntil : user.lockedUntil,
    },
  });

  return {
    isLocked: shouldLock,
    failedAttempts: newAttempts,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - newAttempts),
    lockedUntil: lockedUntil || undefined,
  };
}

export async function recordSuccessfulLogin(username: string): Promise<void> {
  await prisma.user.updateMany({
    where: { username: username.toLowerCase() },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
}

export async function manuallyUnlockAccount(username: string): Promise<boolean> {
  const result = await prisma.user.updateMany({
    where: { username: username.toLowerCase() },
    data: {
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
  return result.count > 0;
}

// ==========================================
// Security Audit Logging Service
// ==========================================

export type SecurityEventType =
  | 'REGISTER'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'MFA_CHALLENGE'
  | 'MFA_SUCCESS'
  | 'MFA_FAILED'
  | 'MFA_ENABLED'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'RATE_LIMITED'
  | 'LOGOUT'
  | 'SESSION_REVOKED';

export async function logAuditEvent({
  eventType,
  username,
  userId,
  ipAddress,
  userAgent,
  details,
}: {
  eventType: SecurityEventType;
  username?: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  details?: string;
}) {
  try {
    const entry = await prisma.auditLog.create({
      data: {
        eventType,
        username: username || null,
        userId: userId || null,
        ipAddress,
        userAgent: userAgent || null,
        details: details || null,
      },
    });

    // Console output for real-time terminal monitoring during demos
    const color =
      eventType.includes('SUCCESS') || eventType.includes('REGISTER') || eventType.includes('ENABLED')
        ? '\x1b[32m' // Green
        : eventType.includes('FAILED') || eventType.includes('LOCKED') || eventType.includes('LIMITED')
        ? '\x1b[31m' // Red
        : '\x1b[33m'; // Yellow
    const reset = '\x1b[0m';

    console.log(
      `${color}[SECURITY EVENT] [${eventType}]${reset} User: ${username || 'anonymous'} | IP: ${ipAddress} | Details: ${details || 'N/A'}`
    );

    return entry;
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

// Extract Client IP address helper
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
