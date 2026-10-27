import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  verifyPassword,
  createSession,
  createMfaChallenge,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_HOURS,
} from '@/lib/auth';
import {
  checkIpRateLimit,
  checkAccountLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  logAuditEvent,
  getClientIp,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent') || undefined;

  // 1. IP Rate Limiting Protection (Max 5 requests/min per IP)
  const rateLimit = checkIpRateLimit(ip, 'login');
  if (!rateLimit.allowed) {
    await logAuditEvent({
      eventType: 'RATE_LIMITED',
      ipAddress: ip,
      userAgent,
      details: `IP rate limit exceeded on /login (Reset in ${rateLimit.resetInSeconds}s)`,
    });
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Too many login attempts from your IP. Please try again in ${rateLimit.resetInSeconds} seconds.`,
        resetInSeconds: rateLimit.resetInSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.resetInSeconds) },
      }
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

    // 2. Account Lockout Protection (Checks failed attempts & lockout timestamp)
    const lockoutStatus = await checkAccountLockout(trimmedUsername);
    if (lockoutStatus.isLocked) {
      await logAuditEvent({
        eventType: 'ACCOUNT_LOCKED',
        username: trimmedUsername,
        ipAddress: ip,
        userAgent,
        details: `Login rejected: Account is locked for ${lockoutStatus.remainingSeconds} more seconds`,
      });
      return NextResponse.json(
        {
          error: `This account is temporarily locked due to excessive failed attempts. Please try again in ${lockoutStatus.remainingSeconds} seconds.`,
          isLocked: true,
          remainingSeconds: lockoutStatus.remainingSeconds,
        },
        { status: 423 } // 423 Locked
      );
    }

    // 3. Find User & Verify Password
    const user = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    // Constant-time behavior / user existence handling:
    // Even if user does not exist, we verify against a dummy hash to prevent timing attacks.
    const dummyHash = '$argon2id$v=19$m=19456,t=2,p=1$hsWu+hDVZA5LDMz2XTF9nA$dgdDGuv4R0U/3AmmF6b95m78EegzIJ9GY1qcUYvCoJo';
    const hashToVerify = user ? user.passwordHash : dummyHash;
    const isPasswordValid = await verifyPassword(hashToVerify, password);

    if (!user || !isPasswordValid) {
      // Record failed attempt on user if user exists
      let failInfo = { isLocked: false, remainingAttempts: 5, failedAttempts: 1 };
      if (user) {
        failInfo = await recordFailedLogin(trimmedUsername);
      }

      const eventType = failInfo.isLocked ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED';
      await logAuditEvent({
        eventType,
        username: trimmedUsername,
        userId: user?.id,
        ipAddress: ip,
        userAgent,
        details: failInfo.isLocked
          ? `Account locked: Reached 5 consecutive failed attempts`
          : `Invalid credentials. Attempts remaining: ${failInfo.remainingAttempts}`,
      });

      if (failInfo.isLocked) {
        return NextResponse.json(
          {
            error: 'Account locked due to 5 consecutive failed login attempts. Locked for 15 minutes.',
            isLocked: true,
            remainingSeconds: 900,
          },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          error: `Invalid username or password. Remaining attempts before lockout: ${failInfo.remainingAttempts}`,
          remainingAttempts: failInfo.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Password is valid -> Reset failed attempts
    await recordSuccessfulLogin(trimmedUsername);

    // 4. Multi-Factor Authentication Check
    if (user.mfaEnabled) {
      // Generate temporary single-use MFA challenge token
      const challengeToken = createMfaChallenge(user.username, user.id);

      await logAuditEvent({
        eventType: 'MFA_CHALLENGE',
        username: user.username,
        userId: user.id,
        ipAddress: ip,
        userAgent,
        details: 'Password verified; prompted for 6-digit TOTP MFA code',
      });

      return NextResponse.json({
        success: true,
        requireMfa: true,
        challengeToken,
        message: 'Password accepted. Please provide your 6-digit authenticator code.',
      });
    }

    // If MFA was not enabled (e.g. legacy or skipped), issue session directly
    const session = await createSession(user.id, ip, userAgent);

    await logAuditEvent({
      eventType: 'LOGIN_SUCCESS',
      username: user.username,
      userId: user.id,
      ipAddress: ip,
      userAgent,
      details: 'Login successful (MFA was not configured)',
    });

    const response = NextResponse.json({
      success: true,
      requireMfa: false,
      user: {
        id: user.id,
        username: user.username,
      },
    });

    // 5. Secure Session Cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true, // Prevents XSS attacks / document.cookie theft
      secure: false,  // Set false in dev/local network to allow demo access over HTTP from Kali VM
      sameSite: 'lax', // Protects against CSRF attacks
      path: '/',
      maxAge: SESSION_DURATION_HOURS * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
