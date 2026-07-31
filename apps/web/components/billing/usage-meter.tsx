import { useTranslations } from 'next-intl';

export function UsageMeter({
  scoresToday,
  scoresLimit,
}: {
  scoresToday: number;
  scoresLimit: number | null;
}) {
  const t = useTranslations('billing');

  if (scoresLimit === null) {
    return <p className="text-sm text-muted-foreground">{t('unlimitedScoring')}</p>;
  }

  const pct = Math.min(100, (scoresToday / scoresLimit) * 100);

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        {t('usageToday', { used: scoresToday, limit: scoresLimit })}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
