import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import { CheckoutResponseSchema } from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getStripeClient } from '@/lib/stripe';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const sub = await prisma.subscription.findUniqueOrThrow({ where: { userId: session.user.id } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    const stripe = getStripeClient();

    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
      await prisma.subscription.update({
        where: { userId: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?success=true`,
      cancel_url: `${appUrl}/settings/billing`,
      metadata: { userId: session.user.id },
      subscription_data: {
        metadata: { userId: session.user.id },
      },
    });

    if (!checkoutSession.url) {
      return apiError('BILLING_ERROR', 502);
    }

    const data = CheckoutResponseSchema.parse({ url: checkoutSession.url });
    return apiSuccess(data);
  } catch {
    return apiError('BILLING_ERROR', 502);
  }
}
