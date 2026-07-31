'use client';

import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type JobSort = 'score' | 'date';

export function JobSortSelect({ value, onChange }: { value: JobSort; onChange: (v: JobSort) => void }) {
  const t = useTranslations('jobs.sort');

  return (
    <Select value={value} onValueChange={(v) => onChange(v as JobSort)}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="score">{t('score')}</SelectItem>
        <SelectItem value="date">{t('date')}</SelectItem>
      </SelectContent>
    </Select>
  );
}
