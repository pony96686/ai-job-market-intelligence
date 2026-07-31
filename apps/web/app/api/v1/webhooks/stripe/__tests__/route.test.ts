import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockConstructEvent, mockUpdate, mockUpdateMany, mockFindFirst, mockOrderUpsert } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockOrderUpsert: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: mockConstructEvent },
  }),
}));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    subscription: {
      update: mockUpdate,
      updateMany: mockUpdateMany,
      findFirst: mockFindFirst,
    },
    order: {
      upsert: mockOrderUpsert,
    },
  },
}));

import { POST } from '../route';

function makeRequest(body: string, signature: string | null = 'valid-sig'): Request {
  const headers = new Headers();
  if (signature) headers.set('stripe-signature', signature);
  return new Request('http://localhost/api/v1/webhooks/stripe', { method: 'POST', headers, body });
}

beforeEach(() => {
  mockConstructEvent.mockReset();
  mockUpdate.mockReset();
  mockUpdateMany.mockReset();
  mockFindFirst.mockReset();
  mockOrderUpsert.mockReset();
});

describe('POST /api/v1/webhooks/stripe', () => {
  it('returns 400 when the signature header is missing', async () => {
    const res = await POST(makeRequest('{}', null));
    expect(res.status).toBe(400);
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const res = await POST(makeRequest('{}'));
    expect(res.status).toBe(400);
  });

  it('upgrades the subscription to PRO on checkout.session.completed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: { customer: 'cus_1', subscription: 'sub_1', metadata: { userId: 'user_1' } },
      },
    });

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      data: expect.objectContaining({
        plan: 'PRO',
        status: 'ACTIVE',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
      }),
    });
  });

  it('does not touch the subscription when checkout metadata has no userId', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_1', subscription: 'sub_1', metadata: {} } },
    });

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('downgrades the subscription to FREE on customer.subscription.deleted', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_1' } },
    });

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_1' },
      data: expect.objectContaining({ plan: 'FREE', status: 'ACTIVE', stripeSubscriptionId: null }),
    });
  });

  it('marks the subscription PAST_DUE on invoice.payment_failed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_1' } },
    });

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_1' },
      data: { status: 'PAST_DUE' },
    });
  });

  it('records an Order on invoice.payment_succeeded when the customer maps to a known subscription', async () => {
    mockFindFirst.mockResolvedValue({ userId: 'user_1', stripeCustomerId: 'cus_1' });
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_1',
          customer: 'cus_1',
          amount_paid: 1900,
          currency: 'usd',
          status: 'paid',
          hosted_invoice_url: 'https://invoice.stripe.com/i/in_1',
          lines: { data: [{ description: 'Pro plan' }] },
        },
      },
    });

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { stripeCustomerId: 'cus_1' } });
    expect(mockOrderUpsert).toHaveBeenCalledWith({
      where: { stripeInvoiceId: 'in_1' },
      create: expect.objectContaining({
        userId: 'user_1',
        stripeInvoiceId: 'in_1',
        amount: 1900,
        currency: 'usd',
        status: 'PAID',
        description: 'Pro plan',
        invoiceUrl: 'https://invoice.stripe.com/i/in_1',
      }),
      update: expect.objectContaining({ status: 'PAID', invoiceUrl: 'https://invoice.stripe.com/i/in_1' }),
    });
  });

  it('does not record an Order on invoice.payment_succeeded when the customer has no matching subscription', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_succeeded',
      data: {
        object: { id: 'in_1', customer: 'cus_unknown', amount_paid: 1900, currency: 'usd', status: 'paid', lines: { data: [] } },
      },
    });

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockOrderUpsert).not.toHaveBeenCalled();
  });

  it('returns 200 and does nothing for unhandled event types', async () => {
    mockConstructEvent.mockReturnValue({ type: 'customer.created', data: { object: {} } });

    const res = await POST(makeRequest('{}'));

    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });
});
