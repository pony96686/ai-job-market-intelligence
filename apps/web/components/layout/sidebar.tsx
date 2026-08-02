'use client';

import { useTranslations } from 'next-intl';
import { LayoutDashboard, Briefcase, Bot, TrendingUp, Settings, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, usePathname } from '@/i18n/navigation';

// Personal items (in-app, use your own data) vs. the public market-data
// group below — kept apart by a plain divider rather than a text heading,
// since Skill Market is the only entry in that second group right now (see
// frontend-spec.md §3.2). Upgrade to a labeled section once 2-3 public pages
// exist.
const NAV_ITEMS = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/jobs', labelKey: 'jobs', icon: Briefcase },
  { href: '/career-coach', labelKey: 'careerCoach', icon: Bot },
  { href: '/settings/profile', labelKey: 'settings', icon: Settings },
  { href: '/settings/billing', labelKey: 'billing', icon: CreditCard },
] as const;

const MARKET_NAV_ITEM = { href: '/market/skills', labelKey: 'market', icon: TrendingUp } as const;

function NavLink({
  href,
  labelKey,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations('nav');

  return (
    <Link
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
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, labelKey, icon }) => (
        <NavLink
          key={href}
          href={href}
          labelKey={labelKey}
          icon={icon}
          active={pathname.startsWith(href)}
          onNavigate={onNavigate}
        />
      ))}
      <hr className="my-2 border-border" />
      <NavLink
        href={MARKET_NAV_ITEM.href}
        labelKey={MARKET_NAV_ITEM.labelKey}
        icon={MARKET_NAV_ITEM.icon}
        active={pathname.startsWith(MARKET_NAV_ITEM.href)}
        onNavigate={onNavigate}
      />
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
