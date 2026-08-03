'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { normalizeSkill } from '@ai-job-market-intelligence/shared/skills';
import { fetchSkillTrend } from '@/lib/api/skills';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const WINDOW_DAYS = 90;

// V1's onboarding lets users type free-text skills ("Node.js", "js", ...) —
// normalizeSkill maps those to the same canonical slugs Skill Intelligence
// tracks.
export function SkillGrowthCard({ skills }: { skills: string[] }) {
  const t = useTranslations('dashboard');

  const slugs = useMemo(() => {
    const seen = new Set<string>();
    for (const raw of skills) {
      for (const normalized of normalizeSkill(raw)) {
        seen.add(normalized.slug);
      }
    }
    return [...seen];
  }, [skills]);

  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ['skill-trend', slug, WINDOW_DAYS],
      queryFn: () => fetchSkillTrend(slug, WINDOW_DAYS),
    })),
  });

  const isLoading = results.some((r) => r.isLoading);

  const items = results
    .map((r) => r.data)
    .filter((d) => !!d && d.series.length > 0)
    .map((d) => ({ slug: d!.slug, name: d!.name, latest: d!.series.at(-1)! }))
    .sort((a, b) => b.latest.jobCount - a.latest.jobCount)
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('skillGrowthHeading')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('skillGrowthNoData')}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.slug} className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {t('skillGrowthJobCount', { count: item.latest.jobCount })}
                  {item.latest.growthPercent !== null && (
                    <span
                      className={item.latest.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}
                    >
                      {item.latest.growthPercent >= 0 ? '+' : ''}
                      {item.latest.growthPercent.toFixed(0)}%
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
