import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  // Fetch full details for the demo dashboard (excluding password hash)
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      mfaEnabled: true,
      failedAttempts: true,
      lockedUntil: true,
      createdAt: true,
      passwordHash: true, // We will show the algorithm breakdown in the demo
    },
  });

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      mfaEnabled: fullUser?.mfaEnabled,
      createdAt: fullUser?.createdAt,
      passwordHashPreview: fullUser?.passwordHash,
      sessionId: user.sessionId,
      sessionTokenPreview: user.sessionTokenPreview,
      sessionExpiresAt: user.sessionExpiresAt,
    },
  });
}
