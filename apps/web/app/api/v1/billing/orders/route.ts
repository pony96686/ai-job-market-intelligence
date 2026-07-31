import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import { OrderListResponseSchema } from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  const data = OrderListResponseSchema.parse(
    orders.map((order) => ({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      description: order.description,
      invoiceUrl: order.invoiceUrl,
      createdAt: order.createdAt.toISOString(),
    })),
  );

  return apiSuccess(data);
}
