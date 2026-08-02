'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchMe, updateNotificationSettings } from '@/lib/api/user';

export function NotificationsForm() {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');

  const { data: me, isLoading } = useQuery({ queryKey: ['user', 'me'], queryFn: fetchMe });
  const [dailyBriefEnabled, setDailyBriefEnabled] = useState(true);

  useEffect(() => {
    if (me) setDailyBriefEnabled(me.dailyBriefEnabled);
  }, [me]);

  const mutation = useMutation({ mutationFn: updateNotificationSettings });

  function handleToggle() {
    const next = !dailyBriefEnabled;
    setDailyBriefEnabled(next);
    mutation.mutate(next);
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>;
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={dailyBriefEnabled}
          onChange={handleToggle}
          className="mt-1 h-4 w-4 rounded border-input"
        />
        <span>
          <span className="block text-sm font-medium">{t('dailyBriefLabel')}</span>
          <span className="block text-xs text-muted-foreground">{t('dailyBriefDescription')}</span>
        </span>
      </label>

      {mutation.isError && <p className="text-sm text-destructive">{t('saveFailed')}</p>}
      {mutation.isSuccess && <p className="text-sm text-muted-foreground">{t('saved')}</p>}
    </div>
  );
}
