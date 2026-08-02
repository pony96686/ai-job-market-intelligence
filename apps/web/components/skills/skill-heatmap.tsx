'use client';

import { useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { CANDIDATE_ENGINEERING_ROLES } from '@ai-job-market-intelligence/shared/constants';
import { ErrorState } from '@/components/common/error-state';
import { EmptyState } from '@/components/common/empty-state';
import { fetchSkillHeatmap } from '@/lib/api/skills';

// The heatmap API is scoped to one role per call (its `role` filter is a
// free-text `contains` match, not one of a small fixed set in the schema),
// so the frontend assembles the skill x role matrix by calling it once per
// role here and combining the results client-side.
const HEATMAP_ROLES = CANDIDATE_ENGINEERING_ROLES;

const MAX_HEATMAP_ROWS = 12;

function cellBackground(value: number, max: number): string {
  if (value === 0 || max === 0) return 'transparent';
  const intensity = 0.15 + 0.65 * (value / max);
  return `rgba(37, 99, 235, ${intensity})`; // primary blue, scaled opacity
}

export function SkillHeatmap() {
  const t = useTranslations('marketSkills');
  const tCommon = useTranslations('common');

  const results = useQueries({
    queries: HEATMAP_ROLES.map((role) => ({
      queryKey: ['skill-heatmap', role],
      queryFn: () => fetchSkillHeatmap(role),
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>;
  }
  if (isError) {
    return <ErrorState message={t('failedToLoad')} />;
  }

  // Union of skills across all roles, ranked by total jobCount across roles.
  const totals = new Map<string, { name: string; total: number }>();
  const bySlugAndRole = new Map<string, number>();

  results.forEach((result, i) => {
    const role = HEATMAP_ROLES[i]!;
    for (const skill of result.data?.skills ?? []) {
      const entry = totals.get(skill.slug);
      totals.set(skill.slug, { name: skill.name, total: (entry?.total ?? 0) + skill.jobCount });
      bySlugAndRole.set(`${skill.slug}:${role}`, skill.jobCount);
    }
  });

  const rows = [...totals.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, MAX_HEATMAP_ROWS);

  if (rows.length === 0) {
    return <EmptyState title={t('noDataTitle')} description={t('noDataDescription')} />;
  }

  const maxValue = Math.max(
    ...rows.flatMap(([slug]) =>
      HEATMAP_ROLES.map((role) => bySlugAndRole.get(`${slug}:${role}`) ?? 0),
    ),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
              {t('table.skill')}
            </th>
            {HEATMAP_ROLES.map((role) => (
              <th
                key={role}
                className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
              >
                {role}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([slug, { name }]) => (
            <tr key={slug} className="border-t border-border/50">
              <td className="py-2 pr-4 font-medium">{name}</td>
              {HEATMAP_ROLES.map((role) => {
                const value = bySlugAndRole.get(`${slug}:${role}`) ?? 0;
                return (
                  <td
                    key={role}
                    className="px-3 py-2 text-center"
                    style={{ backgroundColor: cellBackground(value, maxValue) }}
                  >
                    {value || ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
