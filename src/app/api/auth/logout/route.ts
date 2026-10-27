import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, destroySession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { logAuditEvent, getClientIp } from '@/lib/security';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const user = await getCurrentUser();

  if (user) {
    await logAuditEvent({
      eventType: 'LOGOUT',
      username: user.username,
      userId: user.id,
      ipAddress: ip,
      details: 'User logged out; session token invalidated',
    });
  }

  await destroySession();

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    maxAge: 0,
    path: '/',
  });

  return response;
}
