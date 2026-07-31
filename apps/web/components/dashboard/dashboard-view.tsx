'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/lib/api/user';
import { RecommendedJobs } from './recommended-jobs';
import { SkillGapCard } from './skill-gap-card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardView() {
  const t = useTranslations('dashboard');

  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: fetchMe });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecommendedJobs />
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <SkillGapCard preferredRoles={me?.profile?.preferredRoles ?? []} />
        )}
      </div>
    </div>
  );
}
