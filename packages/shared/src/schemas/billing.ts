import { z } from 'zod';

export const PlanTierSchema = z.enum(['FREE', 'PRO']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const SubscriptionStatusSchema = z.enum(['ACTIVE', 'PAST_DUE', 'CANCELED']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const UsageSummarySchema = z.object({
  scoresToday: z.number().int(),
  scoresLimit: z.number().int().nullable(),
  resetsAt: z.string().datetime(),
});

export const SubscriptionResponseSchema = z.object({
  plan: PlanTierSchema,
  status: SubscriptionStatusSchema,
  currentPeriodEnd: z.string().datetime().nullable(),
  usage: UsageSummarySchema,
});
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

export const CheckoutResponseSchema = z.object({
  url: z.string().url(),
});

export const PortalResponseSchema = z.object({
  url: z.string().url(),
});

// 🆕 Order history: one row per Stripe invoice.payment_succeeded webhook
// event, shown on /settings/billing.
export const OrderStatusSchema = z.enum(['PAID', 'OPEN', 'VOID', 'UNCOLLECTIBLE']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderResponseSchema = z.object({
  id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: OrderStatusSchema,
  description: z.string().nullable(),
  invoiceUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

export const OrderListResponseSchema = z.array(OrderResponseSchema);
