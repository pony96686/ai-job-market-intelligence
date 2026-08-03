'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { fetchAgentHandoffs } from '@/lib/api/career-agent';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function AgentHandoffTimeline() {
  const t = useTranslations('careerCoach');

  const { data: handoffs } = useQuery({
    queryKey: ['agent-handoffs'],
    queryFn: () => fetchAgentHandoffs(5),
  });

  if (!handoffs || handoffs.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardContent className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">{t('handoffTimelineTitle')}</h2>
        <ul className="space-y-3">
          {handoffs.map((h) => (
            <li key={h.id} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {t('handoffFound', {
                    title: h.jobTitle,
                    company: h.company,
                    score: h.matchScore,
                  })}
                </span>
                <Badge variant={h.consumedAt ? 'default' : 'outline'}>
                  {h.consumedAt ? t('handoffStatusDone') : t('handoffStatusPending')}
                </Badge>
              </div>
              <p className="text-muted-foreground">{t('handoffReason', { reason: h.reason })}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
