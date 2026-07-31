'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendMagicLink } from '@/lib/api/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 60;

export function LoginForm({
  initialSent = false,
  initialError = false,
}: {
  initialSent?: boolean;
  initialError?: boolean;
}) {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(initialSent);
  const [cooldown, setCooldown] = useState(initialSent ? RESEND_COOLDOWN_SECONDS : 0);

  const mutation = useMutation({
    mutationFn: sendMagicLink,
    onSuccess: () => {
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const isValidEmail = EMAIL_REGEX.test(email);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('welcomeBack')}</CardTitle>
        <CardDescription>{t('tagline')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {initialError && !sent && <p className="text-sm text-destructive">{t('linkExpired')}</p>}
        {sent ? (
          <div className="space-y-3 text-sm">
            <p>{t('checkEmail')}</p>
            {cooldown > 0 ? (
              <p className="text-muted-foreground">{t('resendIn', { seconds: cooldown })}</p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutation.mutate(email)}
                disabled={mutation.isPending}
              >
                {t('resendLink')}
              </Button>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isValidEmail) mutation.mutate(email);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={mutation.isPending}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={!isValidEmail || mutation.isPending}>
              {mutation.isPending ? t('sending') : t('sendMagicLink')}
            </Button>
            {mutation.isError && <p className="text-sm text-destructive">{t('sendFailed')}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
