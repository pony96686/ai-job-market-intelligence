import { useTranslations } from 'next-intl';
import type { JobSource } from '@ai-job-market-intelligence/shared';

const HIMALAYAS_URL = 'https://himalayas.app/jobs';

// Himalayas' terms require a visible backlink whenever their data is
// displayed. Other sources render nothing here.
export function SourceAttribution({ source }: { source: JobSource }) {
  const t = useTranslations('jobs');

  if (source !== 'HIMALAYAS') return null;

  return (
    <a
      href={HIMALAYAS_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
    >
      {t('viaHimalayas')}
    </a>
  );
}
