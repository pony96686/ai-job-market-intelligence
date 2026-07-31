'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import type { OrderResponse, OrderStatus } from '@ai-job-market-intelligence/shared';
import { fetchOrders } from '@/lib/api/billing';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<OrderStatus, string> = {
  PAID: 'bg-green-500 text-white',
  OPEN: 'bg-yellow-500 text-white',
  VOID: 'bg-gray-400 text-white',
  UNCOLLECTIBLE: 'bg-red-500 text-white',
};

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}

function OrderRow({ order }: { order: OrderResponse }) {
  const t = useTranslations('billing');

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 text-sm last:border-0">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-medium">{order.description ?? t('orderDefaultDescription')}</p>
        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
      <Badge className={cn(STATUS_STYLES[order.status])}>{t(`orderStatus.${order.status}`)}</Badge>
      <span className="w-20 shrink-0 text-right font-medium">{formatAmount(order.amount, order.currency)}</span>
      {order.invoiceUrl ? (
        <a
          href={order.invoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
        >
          {t('viewInvoice')}
        </a>
      ) : (
        <span className="w-[3.5rem] shrink-0" />
      )}
    </div>
  );
}

export function OrderHistory() {
  const t = useTranslations('billing');
  const { data, isLoading } = useQuery({ queryKey: ['billing', 'orders'], queryFn: fetchOrders });

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{t('orderHistoryTitle')}</h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noOrders')}</p>
      ) : (
        <div data-testid="order-history">
          {data.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
