import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  verifyTotpCode,
  consumeMfaChallenge,
  createSession,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_HOURS,
} from '@/lib/auth';
import {
  checkIpRateLimit,
  logAuditEvent,
  getClientIp,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || undefined;

  // Rate limit MFA verification (max 5 attempts per min)
  const rateLimit = checkIpRateLimit(ip, 'verify-mfa', 5, 60000);
  if (!rateLimit.allowed) {
    await logAuditEvent({
      eventType: 'RATE_LIMITED',
      ipAddress: ip,
      userAgent,
      details: 'MFA rate limit exceeded',
    });
    return NextResponse.json(
      { error: `Too many MFA attempts. Please wait ${rateLimit.resetInSeconds} seconds.` },
      { status: 429 }
    );
  }

  try {
    const { challengeToken, code } = await req.json();

    if (!challengeToken || !code) {
      return NextResponse.json(
        { error: 'Challenge token and 6-digit MFA code are required' },
        { status: 400 }
      );
    }

    // Retrieve challenge
    const challenge = consumeMfaChallenge(challengeToken);
    if (!challenge) {
      return NextResponse.json(
        { error: 'MFA session expired or invalid. Please log in again.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: challenge.userId },
    });

    if (!user || !user.mfaSecret) {
      return NextResponse.json(
        { error: 'User MFA configuration not found' },
        { status: 404 }
      );
    }

    const isValid = verifyTotpCode(code, user.mfaSecret);
    if (!isValid) {
      await logAuditEvent({
        eventType: 'MFA_FAILED',
        username: user.username,
        userId: user.id,
        ipAddress: ip,
        userAgent,
        details: 'Incorrect 6-digit TOTP code entered during login',
      });
      return NextResponse.json(
        { error: 'Invalid 6-digit authenticator code. Codes rotate every 30 seconds.' },
        { status: 401 }
      );
    }

    // MFA succeeded! Create user session
    const session = await createSession(user.id, ip, userAgent);

    await logAuditEvent({
      eventType: 'MFA_SUCCESS',
      username: user.username,
      userId: user.id,
      ipAddress: ip,
      userAgent,
      details: 'MFA verification passed via TOTP',
    });

    await logAuditEvent({
      eventType: 'LOGIN_SUCCESS',
      username: user.username,
      userId: user.id,
      ipAddress: ip,
      userAgent,
      details: 'Full authenticated session established with MFA',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful!',
      user: {
        id: user.id,
        username: user.username,
      },
    });

    // Set HttpOnly, SameSite Session Cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      secure: false, // Local dev/demo friendly for cross-network access
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_HOURS * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Verify MFA error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
