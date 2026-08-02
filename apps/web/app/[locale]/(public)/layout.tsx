import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { PublicHeader } from '@/components/layout/public-header';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader isLoggedIn={!!session?.user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
