import { useTranslations } from 'next-intl';

export function ScoringBanner() {
  const t = useTranslations('jobs');

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm"
      role="status"
      aria-busy="true"
    >
      <span>{t('scoringBanner')}</span>
    </div>
  );
}
