import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { NotificationsForm } from '@/components/settings/notifications-form';

export default function NotificationsSettingsPage() {
  const t = useTranslations('notifications');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings/profile" className="text-sm text-muted-foreground hover:underline">
          ← {t('backToProfile')}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">{t('heading')}</h1>
      <NotificationsForm />
    </div>
  );
}
