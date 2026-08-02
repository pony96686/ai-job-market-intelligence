'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';

export function PublicHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations('common');

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
      <Link href="/" className="text-lg font-semibold">
        🚀 {t('appName')}
      </Link>
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('backToDashboard')}
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t('logIn')}
          </Link>
        )}
      </div>
    </header>
  );
}
