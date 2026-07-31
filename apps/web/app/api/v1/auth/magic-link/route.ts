import { signIn } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { MagicLinkRequestSchema } from '@ai-job-market-intelligence/shared';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = MagicLinkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }

  try {
    await signIn('resend', { email: parsed.data.email, redirect: false });
  } catch {
    // Always return 200 regardless of whether the email exists or the send
    // succeeded, to prevent email enumeration
  }

  return apiSuccess({ message: 'Check your email for a login link' });
}
