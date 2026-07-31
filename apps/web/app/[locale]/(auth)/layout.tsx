import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('common');

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-semibold">🚀 {t('appName')}</p>
          <LocaleSwitcher />
        </div>
        {children}
      </div>
    </div>
  );
}
