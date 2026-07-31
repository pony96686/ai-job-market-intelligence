import { useTranslations } from 'next-intl';
import { OnboardingForm } from '@/components/profile/onboarding-form';
import { ResumeUpload } from '@/components/profile/resume-upload';
import { GithubConnect } from '@/components/profile/github-connect';

export default function OnboardingPage() {
  const t = useTranslations('onboarding');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('step')}</p>
      </div>
      <OnboardingForm />
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
