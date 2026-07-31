'use client';

import { useTranslations } from 'next-intl';
import { LayoutDashboard, Briefcase, Settings, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, usePathname } from '@/i18n/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/jobs', labelKey: 'jobs', icon: Briefcase },
  { href: '/settings/profile', labelKey: 'settings', icon: Settings },
  { href: '/settings/billing', labelKey: 'billing', icon: CreditCard },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const t = useTranslations('common');

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border p-4 md:flex">
      <p className="mb-6 px-3 text-lg font-semibold">🚀 {t('appName')}</p>
      <SidebarNav />
      <div className="mt-auto space-y-1 border-t border-border pt-4">
        <p className="truncate px-3 text-xs text-muted-foreground">{userEmail}</p>
      </div>
    </aside>
  );
}
