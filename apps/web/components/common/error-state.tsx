import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useTranslations('common');

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/50 py-16 text-center">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('retry')}
        </Button>
      )}
    </div>
  );
}
