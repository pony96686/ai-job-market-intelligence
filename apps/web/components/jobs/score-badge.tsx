import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ScoreBadge({ score }: { score: number }) {
  const colorClass =
    score >= 75
      ? 'bg-green-100 text-green-800'
      : score >= 50
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-gray-100 text-gray-600';

  return (
    <Badge data-testid="score-badge" className={cn(colorClass, 'text-sm font-semibold')}>
      {score}
    </Badge>
  );
}
