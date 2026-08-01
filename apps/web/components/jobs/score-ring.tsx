import { useTranslations } from 'next-intl';
import type { JobDecision } from '@ai-job-market-intelligence/shared';
import { cn } from '@/lib/utils';

// Light top-to-bottom tints matching this app's existing green/amber/slate
// decision palette (see decision-badge.tsx), instead of the earlier dark
// widget look — reads as a soft accent panel inside the white job-card
// rather than a contrasting dark block.
const RING_STYLES: Record<JobDecision, { bg: string; text: string; stroke: string; glow: string }> = {
  APPLY: {
    bg: 'bg-gradient-to-b from-green-50 to-green-200',
    text: 'text-green-900',
    stroke: '#16a34a',
    glow: 'shadow-[0_4px_14px_-6px_rgba(34,197,94,0.5)]',
  },
  MAYBE: {
    bg: 'bg-gradient-to-b from-amber-50 to-amber-200',
    text: 'text-amber-900',
    stroke: '#d97706',
    glow: 'shadow-[0_4px_14px_-6px_rgba(217,119,6,0.4)]',
  },
  SKIP: {
    bg: 'bg-gradient-to-b from-slate-50 to-slate-200',
    text: 'text-slate-700',
    stroke: '#64748b',
    glow: '',
  },
};

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ score, decision }: { score: number; decision: JobDecision }) {
  const t = useTranslations('decision');
  const { bg, text, stroke, glow } = RING_STYLES[decision];
  const offset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div
      data-testid="score-badge"
      className={cn('flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl p-3', bg, text, glow)}
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg viewBox="0 0 84 84" className="absolute inset-0 -rotate-90">
          <circle cx="42" cy="42" r={RADIUS} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="7" />
          <circle
            cx="42"
            cy="42"
            r={RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <span data-testid="score-value" className="text-lg font-bold">
          {score}
        </span>
      </div>
      <span
        data-testid="decision-badge"
        className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide"
      >
        {t(decision)}
      </span>
    </div>
  );
}
