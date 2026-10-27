import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 60,
      orderBy: { timestamp: 'desc' },
    });

    const totalLogs = await prisma.auditLog.count();
    const failedLogins = await prisma.auditLog.count({
      where: { eventType: 'LOGIN_FAILED' },
    });
    const accountLockouts = await prisma.auditLog.count({
      where: { eventType: 'ACCOUNT_LOCKED' },
    });
    const rateLimitedEvents = await prisma.auditLog.count({
      where: { eventType: 'RATE_LIMITED' },
    });
    const successfulLogins = await prisma.auditLog.count({
      where: { eventType: 'LOGIN_SUCCESS' },
    });

    // Check currently locked accounts
    const now = new Date();
    const lockedUsers = await prisma.user.findMany({
      where: {
        lockedUntil: {
          gt: now,
        },
      },
      select: {
        username: true,
        failedAttempts: true,
        lockedUntil: true,
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalLogs,
        successfulLogins,
        failedLogins,
        accountLockouts,
        rateLimitedEvents,
        lockedAccountsCount: lockedUsers.length,
      },
      lockedUsers,
      logs,
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
