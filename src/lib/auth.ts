import * as argon2 from '@node-rs/argon2';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import prisma from './prisma';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'secure_session_token';
export const SESSION_DURATION_HOURS = 24;

// 1. Password Hashing with Argon2id
// Argon2id combines Argon2d (data-dependent) and Argon2i (data-independent)
// making it resistant to both side-channel and GPU cracking attacks.
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    memoryCost: 19456, // 19 MB memory cost
    timeCost: 2,       // 2 iterations
    parallelism: 1,    // 1 thread
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error('Argon2 verification error:', error);
    return false;
  }
}

// Password Complexity Validation (NIST/OWASP aligned)
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters long');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter (A-Z)');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter (a-z)');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one digit (0-9)');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
  return { valid: errors.length === 0, errors };
}

// 2. Multi-Factor Authentication (TOTP - RFC 6238)
export async function generateMfaDetails(username: string): Promise<{
  secret: string;
  uri: string;
  qrCodeDataUrl: string;
}> {
  const secret = generateSecret();
  const uri = generateURI({
    issuer: 'SecureAuth Demo',
    label: username,
    secret,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(uri);
  return { secret, uri, qrCodeDataUrl };
}

export function verifyTotpCode(token: string, secret: string): boolean {
  try {
    // epochTolerance: 30 allows a ±30-second window (previous, current, next 30s)
    // This resolves phone/computer clock desync and prevents code rollover errors
    const result = verifySync({ token: token.trim(), secret, epochTolerance: 30 });
    return Boolean(result && result.valid);
  } catch {
    return false;
  }
}

// 3. Cryptographically Secure Session Management
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 256 bits of entropy
}

export async function createSession(userId: string, reqIp?: string, reqUserAgent?: string) {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      token,
      userId,
      ipAddress: reqIp || null,
      userAgent: reqUserAgent || null,
      expiresAt,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          mfaEnabled: true,
          createdAt: true,
        },
      },
    },
  });

  return session;
}

export async function getCurrentUser() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          mfaEnabled: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) return null;

  // Check expiration
  if (new Date() > session.expiresAt) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    ...session.user,
    sessionId: session.id,
    sessionTokenPreview: `${session.token.slice(0, 8)}...${session.token.slice(-6)}`,
    sessionExpiresAt: session.expiresAt,
  };
}

export async function destroySession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
}

// In-Memory MFA Challenge Store (5-minute expiration)
interface MfaChallenge {
  username: string;
  userId: string;
  expiresAt: number;
}

const mfaChallenges = new Map<string, MfaChallenge>();

export function createMfaChallenge(username: string, userId: string): string {
  const challengeToken = crypto.randomBytes(32).toString('hex');
  mfaChallenges.set(challengeToken, {
    username,
    userId,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
  return challengeToken;
}

export function consumeMfaChallenge(challengeToken: string): MfaChallenge | null {
  const challenge = mfaChallenges.get(challengeToken);
  if (!challenge) return null;
  if (Date.now() > challenge.expiresAt) {
    mfaChallenges.delete(challengeToken);
    return null;
  }
  mfaChallenges.delete(challengeToken); // Single-use token
  return challenge;
}
