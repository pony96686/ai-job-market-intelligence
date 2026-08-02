'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { fetchSkillRanking, type SkillRankingSort, type SkillWindowDays } from '@/lib/api/skills';

const WINDOW_OPTIONS: SkillWindowDays[] = [30, 90, 365];

export function SkillRankingTable() {
  const t = useTranslations('marketSkills');
  const tCommon = useTranslations('common');
  const [windowDays, setWindowDays] = useState<SkillWindowDays>(90);
  const [sort, setSort] = useState<SkillRankingSort>('count');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['skill-ranking', windowDays, sort],
    queryFn: () => fetchSkillRanking({ windowDays, sort, limit: 20 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={String(windowDays)}
          onValueChange={(v) => setWindowDays(Number(v) as SkillWindowDays)}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_OPTIONS.map((days) => (
              <SelectItem key={days} value={String(days)}>
                {t('windowDays', { days })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SkillRankingSort)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count">{t('sort.count')}</SelectItem>
            <SelectItem value="growing">{t('sort.growing')}</SelectItem>
            <SelectItem value="declining">{t('sort.declining')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
      ) : isError ? (
        <ErrorState message={t('failedToLoad')} onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title={t('noDataTitle')} description={t('noDataDescription')} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{t('table.rank')}</th>
              <th className="py-2 pr-4 font-medium">{t('table.skill')}</th>
              <th className="py-2 pr-4 font-medium">{t('table.jobCount')}</th>
              <th className="py-2 font-medium">{t('table.growth')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.slug} className="border-b border-border/50">
                <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                <td className="py-2 pr-4 font-medium">{item.name}</td>
                <td className="py-2 pr-4">{item.jobCount}</td>
                <td className="py-2">
                  {item.growthPercent === null ? (
                    <span className="text-muted-foreground">{t('accumulatingData')}</span>
                  ) : (
                    <span className={item.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {item.growthPercent >= 0 ? '+' : ''}
                      {item.growthPercent.toFixed(0)}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
