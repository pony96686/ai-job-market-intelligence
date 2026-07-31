import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import { PortalResponseSchema } from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getStripeClient } from '@/lib/stripe';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const sub = await prisma.subscription.findUniqueOrThrow({ where: { userId: session.user.id } });
  if (!sub.stripeCustomerId) {
    return apiError('BILLING_ERROR', 502, undefined, 'No billing account found for this user');
  }

  try {
    const stripe = getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    const data = PortalResponseSchema.parse({ url: portalSession.url });
    return apiSuccess(data);
  } catch {
    return apiError('BILLING_ERROR', 502);
  }
}
