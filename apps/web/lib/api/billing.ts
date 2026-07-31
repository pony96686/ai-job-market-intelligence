import type { SubscriptionResponse, OrderResponse } from '@ai-job-market-intelligence/shared';

export async function fetchSubscription(): Promise<SubscriptionResponse> {
  const res = await fetch('/api/v1/billing/subscription');
  if (!res.ok) throw new Error('Failed to load subscription');
  const body = await res.json();
  return body.data;
}

export async function fetchOrders(): Promise<OrderResponse[]> {
  const res = await fetch('/api/v1/billing/orders');
  if (!res.ok) throw new Error('Failed to load orders');
  const body = await res.json();
  return body.data;
}

export async function createCheckoutSession(): Promise<string> {
  const res = await fetch('/api/v1/billing/checkout', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start checkout');
  const body = await res.json();
  return body.data.url;
}

export async function createPortalSession(): Promise<string> {
  const res = await fetch('/api/v1/billing/portal', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to open billing portal');
  const body = await res.json();
  return body.data.url;
}
