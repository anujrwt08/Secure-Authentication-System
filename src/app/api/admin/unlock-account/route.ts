import { NextRequest, NextResponse } from 'next/server';
import {
  manuallyUnlockAccount,
  resetIpRateLimit,
  resetAllRateLimits,
  logAuditEvent,
  getClientIp,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const body = await req.json().catch(() => ({}));
    const { username, resetIp, resetAllRateLimits: clearAll } = body;

    // Direct single-click reset for all rate limits
    if (clearAll) {
      resetAllRateLimits();
      await logAuditEvent({
        eventType: 'ACCOUNT_UNLOCKED',
        ipAddress: ip,
        details: 'All IP rate limits successfully flushed and reset with single click',
      });
      return NextResponse.json({
        success: true,
        message: 'All IP rate limits have been cleared!',
      });
    }

    if (username) {
      const unlocked = await manuallyUnlockAccount(username);
      if (unlocked) {
        await logAuditEvent({
          eventType: 'ACCOUNT_UNLOCKED',
          username,
          ipAddress: ip,
          details: 'Account manually unlocked via Admin controls',
        });
      }
    }

    if (resetIp) {
      resetIpRateLimit(resetIp, 'login');
      resetIpRateLimit(resetIp, 'register');
      resetIpRateLimit(resetIp, 'verify-mfa');
    }

    return NextResponse.json({
      success: true,
      message: 'Account lockout and/or IP rate limits successfully reset',
    });
  } catch (error) {
    console.error('Admin unlock error:', error);
    return NextResponse.json({ error: 'Failed to unlock' }, { status: 500 });
  }
}
