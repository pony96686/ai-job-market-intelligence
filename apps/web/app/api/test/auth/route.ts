import { NextResponse } from 'next/server';
import { encode } from '@auth/core/jwt';
import { z } from 'zod';
import { prisma } from '@ai-job-market-intelligence/db';

const BodySchema = z.object({ email: z.string().email() });
const SESSION_COOKIE_NAME = 'authjs.session-token';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Enabled in test environments only — bypasses the Magic Link flow so
// Playwright can obtain an already-logged-in session directly.
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_TEST_ROUTES !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'AUTH_SECRET not configured' }, { status: 500 });
  }

  const token = await encode({
    secret,
    salt: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE_SECONDS,
    token: {
      id: user.id,
      sub: user.id,
      email: user.email,
      onboardingCompleted: user.onboardingCompleted,
    },
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
