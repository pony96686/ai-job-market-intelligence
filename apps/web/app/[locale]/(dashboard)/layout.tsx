import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from '@/i18n/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect({ href: '/login', locale });
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={session.user.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header userEmail={session.user.email} />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
