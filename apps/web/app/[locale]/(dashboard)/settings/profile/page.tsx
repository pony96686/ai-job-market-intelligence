import { useTranslations } from 'next-intl';
import { ProfileForm } from '@/components/profile/profile-form';
import { ResumeUpload } from '@/components/profile/resume-upload';
import { GithubConnect } from '@/components/profile/github-connect';

export default function ProfileSettingsPage() {
  const t = useTranslations('profile');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('heading')}</h1>
      <ProfileForm />
      <p className="text-sm text-muted-foreground">{t('rescoreWarning')}</p>
      <div className="space-y-4 border-t border-border pt-6">
        <div>
          <p className="text-sm font-medium">{t('careerProfileHeading')}</p>
          <p className="text-xs text-muted-foreground">{t('careerProfileDescription')}</p>
        </div>
        <ResumeUpload />
        <GithubConnect />
      </div>
    </div>
  );
}
