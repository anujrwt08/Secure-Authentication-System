import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyTotpCode } from '@/lib/auth';
import { logAuditEvent, getClientIp, checkIpRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || undefined;

  const rateLimit = checkIpRateLimit(ip, 'enable-mfa', 10, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  try {
    const { username, token } = await req.json();

    if (!username || !token) {
      return NextResponse.json(
        { error: 'Username and MFA verification code are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (!user || !user.mfaSecret) {
      return NextResponse.json(
        { error: 'User or MFA secret not found' },
        { status: 404 }
      );
    }

    const isValid = verifyTotpCode(token, user.mfaSecret);
    if (!isValid) {
      await logAuditEvent({
        eventType: 'MFA_FAILED',
        username: user.username,
        userId: user.id,
        ipAddress: ip,
        userAgent,
        details: 'Initial MFA confirmation code verification failed',
      });

      return NextResponse.json(
        { error: 'Invalid MFA verification code. Please check your authenticator app.' },
        { status: 400 }
      );
    }

    // Mark MFA enabled in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    await logAuditEvent({
      eventType: 'MFA_ENABLED',
      username: user.username,
      userId: user.id,
      ipAddress: ip,
      userAgent,
      details: 'MFA (TOTP RFC 6238) successfully activated',
    });

    return NextResponse.json({
      success: true,
      message: 'Multi-factor authentication successfully enabled! You can now log in.',
    });
  } catch (error) {
    console.error('Enable MFA error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
