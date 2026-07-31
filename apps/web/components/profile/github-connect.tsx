'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { linkGithub } from '@/lib/api/user';
import { useCareerProfile } from './use-career-profile';

const TOP_LANGUAGES_SHOWN = 4;

// githubLanguages stores raw byte counts per language (packages/ai's
// fetchGithubProfile), not percentages — the distribution should read as
// "JavaScript 45% · TypeScript 30% · Go 25%", so this normalizes bytes ->
// percent-of-total for display.
function formatLanguages(languages: Record<string, number>): string {
  const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  if (total === 0) return '';

  return Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_LANGUAGES_SHOWN)
    .map(([lang, bytes]) => `${lang} ${Math.round((bytes / total) * 100)}%`)
    .join(' · ');
}

export function GithubConnect() {
  const t = useTranslations('github');
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');

  const { data, githubTakingLonger } = useCareerProfile();
  const github = data?.github;

  const mutation = useMutation({
    mutationFn: linkGithub,
    onSuccess: () => {
      // The route sets githubParseStatus=PENDING synchronously before
      // enqueueing, so invalidating here immediately
      // flips the UI into the Parsing state instead of waiting on the
      // worker to pick up the job.
      queryClient.invalidateQueries({ queryKey: ['career-profile'] });
    },
  });

  const languagesText = github?.languages ? formatLanguages(github.languages) : '';

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t('usernamePlaceholder')}
          disabled={mutation.isPending}
          className="max-w-xs"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => mutation.mutate(username)}
          disabled={!username.trim() || mutation.isPending}
        >
          {mutation.isPending ? t('connecting') : t('connectButton')}
        </Button>
      </div>

      {mutation.isError && <p className="text-sm text-destructive">{t('connectFailed')}</p>}

      {github?.status === 'PENDING' && (
        <p className="text-sm text-muted-foreground">
          {t('connected')} · {t('parsing')}
          {githubTakingLonger && <span className="block">{t('takingLonger')}</span>}
        </p>
      )}

      {github?.status === 'FAILED' && <p className="text-sm text-destructive">{t('parseFailed')}</p>}

      {github?.status === 'SUCCESS' && (
        <div className="space-y-1 text-sm" data-testid="github-parsed">
          {languagesText ? (
            <p className="text-muted-foreground">{t('parsedLanguages', { languages: languagesText })}</p>
          ) : (
            <p className="text-muted-foreground">{t('noReposFound')}</p>
          )}
          {github.summary && <p className="text-muted-foreground">{github.summary}</p>}
        </div>
      )}
    </div>
  );
}
