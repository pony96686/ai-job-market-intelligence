'use client';

import { useTranslations } from 'next-intl';
import { SkillRankingTable } from './skill-ranking-table';
import { SkillHeatmap } from './skill-heatmap';

export function MarketSkillsView() {
  const t = useTranslations('marketSkills');

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('rankingHeading')}</h2>
        <SkillRankingTable />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('heatmapHeading')}</h2>
        <p className="text-sm text-muted-foreground">{t('heatmapDescription')}</p>
        <SkillHeatmap />
      </section>
    </div>
  );
}
