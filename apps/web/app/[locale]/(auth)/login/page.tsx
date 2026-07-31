import { LoginForm } from '@/components/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm initialSent={params.sent === 'true'} initialError={params.error === 'true'} />;
}
