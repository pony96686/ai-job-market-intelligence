import { auth } from '@/lib/auth';
import { redirect } from '@/i18n/navigation';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  redirect({ href: session?.user ? '/dashboard' : '/login', locale });
}
