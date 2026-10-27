import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, validatePasswordStrength, generateMfaDetails } from '@/lib/auth';
import { logAuditEvent, getClientIp, checkIpRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || undefined;

  // Rate limit registration endpoint (max 10 per minute per IP)
  const rateLimit = checkIpRateLimit(ip, 'register', 10, 60000);
  if (!rateLimit.allowed) {
    await logAuditEvent({
      eventType: 'RATE_LIMITED',
      ipAddress: ip,
      userAgent,
      details: 'Exceeded registration rate limit',
    });
    return NextResponse.json(
      { error: `Too many registration attempts. Please wait ${rateLimit.resetInSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 25) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 25 characters' },
        { status: 400 }
      );
    }

    // OWASP Password Strength Check
    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: 'Password does not meet complexity requirements', details: passwordCheck.errors },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Hash password with Argon2id
    const passwordHash = await hashPassword(password);

    // Generate TOTP MFA secret and QR code for scanning
    const mfa = await generateMfaDetails(trimmedUsername);

    const user = await prisma.user.create({
      data: {
        username: trimmedUsername,
        passwordHash,
        mfaSecret: mfa.secret,
        mfaEnabled: false, // will be confirmed when user scans QR and inputs code
      },
    });

    await logAuditEvent({
      eventType: 'REGISTER',
      username: trimmedUsername,
      userId: user.id,
      ipAddress: ip,
      userAgent,
      details: 'Account registered with Argon2id password hash',
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Set up Multi-Factor Authentication to complete activation.',
      user: {
        id: user.id,
        username: user.username,
      },
      mfa: {
        secret: mfa.secret,
        uri: mfa.uri,
        qrCodeDataUrl: mfa.qrCodeDataUrl,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
