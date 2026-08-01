import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ScoreBadge({ score }: { score: number }) {
  const colorClass =
    score >= 75 ? 'bg-green-600 text-white' : score >= 50 ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white';

  return (
    <Badge data-testid="score-badge" className={cn(colorClass, 'text-sm font-semibold')}>
      {score}
    </Badge>
  );
}
