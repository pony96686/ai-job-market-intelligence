'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { usePathname } from '@/i18n/navigation';
import { SidebarNav } from './sidebar';
import { UserMenu } from './user-menu';
import { LocaleSwitcher } from './locale-switcher';

export function Header({ userEmail }: { userEmail: string }) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function breadcrumbLabel(): string {
    if (pathname === '/jobs') return t('jobs');
    if (pathname.startsWith('/jobs/')) return t('jobDetail');
    if (pathname.startsWith('/settings/billing')) return t('billing');
    if (pathname.startsWith('/settings')) return t('settings');
    if (pathname.startsWith('/onboarding')) return t('onboarding');
    return '';
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden" aria-label={t('openMenu')}>
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle className="mb-6">🚀 {tCommon('appName')}</SheetTitle>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium text-muted-foreground">{breadcrumbLabel()}</span>
      </div>
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <UserMenu email={userEmail} />
      </div>
    </header>
  );
}
