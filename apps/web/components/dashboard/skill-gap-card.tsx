'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { fetchSkillGap } from '@/lib/api/skill-gap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/error-state';

export function SkillGapCard({ preferredRoles }: { preferredRoles: string[] }) {
  const t = useTranslations('dashboard');
  const defaultTargetRole = preferredRoles[0] ?? '';
  const [targetRole, setTargetRole] = useState(defaultTargetRole);
  const [submittedRole, setSubmittedRole] = useState(defaultTargetRole);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['skill-gap', submittedRole],
    queryFn: () => fetchSkillGap(submittedRole),
    enabled: submittedRole.trim().length >= 2,
  });

  function selectRole(role: string) {
    setTargetRole(role);
    setSubmittedRole(role);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('skillGapHeading')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="target-role" className="mb-1 block text-sm font-medium">
            {t('targetRoleLabel')}
          </label>
          <Input
            id="target-role"
            value={targetRole}
            placeholder={t('targetRolePlaceholder')}
            onChange={(e) => setTargetRole(e.target.value)}
            onBlur={() => setSubmittedRole(targetRole)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSubmittedRole(targetRole);
            }}
          />
          {preferredRoles.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {preferredRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => selectRole(role)}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    role === submittedRole
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <ErrorState message={t('failedToLoadSkillGap')} onRetry={() => refetch()} />
        ) : data ? (
          <div className="space-y-3" data-testid="skill-gap-result">
            {data.hasSkillData ? (
              <>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{t('matchLabel', { percent: data.matchPercent })}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${data.matchPercent}%` }}
                    />
                  </div>
                </div>

                {data.lowConfidence && (
                  <p className="text-xs text-muted-foreground">{t('lowConfidenceNotice')}</p>
                )}

                {data.missingSkills.length > 0 ? (
                  <div>
                    <p className="mb-1 text-sm font-medium">{t('missingSkillsLabel')}</p>
                    <div className="flex flex-wrap gap-2">
                      {data.missingSkills.map((skill) => (
                        <span key={skill} className="rounded-md bg-secondary px-2 py-0.5 text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('noGapDescription')}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noSkillDataDescription')}</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
