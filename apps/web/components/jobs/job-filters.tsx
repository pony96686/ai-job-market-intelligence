'use client';

import { useTranslations } from 'next-intl';
import type { JobDecision } from '@ai-job-market-intelligence/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface JobFiltersProps {
  decision: JobDecision | 'ALL';
  minScore: number;
  onDecisionChange: (value: JobDecision | 'ALL') => void;
  onMinScoreChange: (value: number) => void;
}

export function JobFilters({ decision, minScore, onDecisionChange, onMinScoreChange }: JobFiltersProps) {
  const t = useTranslations('jobs.filters');

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="decision-filter" className="whitespace-nowrap text-sm text-muted-foreground">
          {t('decisionLabel')}
        </Label>
        <Select value={decision} onValueChange={(v) => onDecisionChange(v as JobDecision | 'ALL')}>
          <SelectTrigger id="decision-filter" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('all')}</SelectItem>
            <SelectItem value="APPLY">{t('apply')}</SelectItem>
            <SelectItem value="MAYBE">{t('maybe')}</SelectItem>
            <SelectItem value="SKIP">{t('skip')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-[200px] items-center gap-2">
        <Label className="whitespace-nowrap text-sm text-muted-foreground">
          {t('minScoreLabel', { score: minScore })}
        </Label>
        <Slider value={[minScore]} onValueChange={([v]) => onMinScoreChange(v)} max={100} step={5} />
      </div>
    </div>
  );
}
