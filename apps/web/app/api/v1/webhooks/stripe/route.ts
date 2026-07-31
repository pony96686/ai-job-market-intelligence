import type Stripe from 'stripe';
import { prisma } from '@ai-job-market-intelligence/db';
import { getStripeClient } from '@/lib/stripe';

function mapStripeStatus(status: Stripe.Subscription.Status): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' {
  if (status === 'active' || status === 'trialing') return 'ACTIVE';
  if (status === 'past_due' || status === 'unpaid') return 'PAST_DUE';
  return 'CANCELED';
}

function mapInvoiceStatus(status: Stripe.Invoice.Status | null): 'PAID' | 'OPEN' | 'VOID' | 'UNCOLLECTIBLE' {
  if (status === 'paid') return 'PAID';
  if (status === 'void') return 'VOID';
  if (status === 'uncollectible') return 'UNCOLLECTIBLE';
  return 'OPEN';
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object;
      const userId = checkoutSession.metadata?.userId;
      if (userId) {
        await prisma.subscription.update({
          where: { userId },
          data: {
            plan: 'PRO',
            status: 'ACTIVE',
            stripeCustomerId: checkoutSession.customer as string,
            stripeSubscriptionId: checkoutSession.subscription as string,
          },
        });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await prisma.subscription.update({
          where: { userId },
          data: {
            status: mapStripeStatus(subscription.status),
            stripePriceId: subscription.items.data[0]?.price.id,
            currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
          },
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: subscription.customer as string },
        data: { plan: 'FREE', status: 'ACTIVE', stripeSubscriptionId: null, currentPeriodEnd: null },
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: invoice.customer as string },
        data: { status: 'PAST_DUE' },
      });
      break;
    }
    // 🆕 Order history: one row per successful invoice payment, shown on
    // /settings/billing. Resolved via stripeCustomerId (not invoice metadata,
    // which isn't reliably populated) — same lookup pattern as the failure
    // handler above. Upsert on stripeInvoiceId keeps this idempotent against
    // Stripe's at-least-once webhook delivery.
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const sub = await prisma.subscription.findFirst({
        where: { stripeCustomerId: invoice.customer as string },
      });
      if (sub) {
        await prisma.order.upsert({
          where: { stripeInvoiceId: invoice.id! },
          create: {
            userId: sub.userId,
            stripeInvoiceId: invoice.id!,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: mapInvoiceStatus(invoice.status),
            description: invoice.lines.data[0]?.description ?? null,
            invoiceUrl: invoice.hosted_invoice_url ?? null,
          },
          update: {
            status: mapInvoiceStatus(invoice.status),
            invoiceUrl: invoice.hosted_invoice_url ?? null,
          },
        });
      }
      break;
    }
    default:
      break;
  }

  return new Response('ok', { status: 200 });
}
