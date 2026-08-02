import { auth } from '@/lib/auth';
import { PricingView } from '@/components/billing/pricing-view';

export default async function PricingPage() {
  const session = await auth();
  return <PricingView isLoggedIn={!!session?.user} />;
}
