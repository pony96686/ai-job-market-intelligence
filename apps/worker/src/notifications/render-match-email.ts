import type { Job, JobScore } from '@ai-job-market-intelligence/db';

export type EmailLocale = 'en' | 'zh';

interface RenderMatchEmailInput {
  job: Pick<Job, 'id' | 'title' | 'company' | 'location' | 'url'>;
  score: Pick<JobScore, 'score' | 'reasoning' | 'skillGap'>;
  appUrl: string;
  locale?: EmailLocale;
}

// Jobs now come from 5 Tier-1 sources, not just RemoteOK.
const COPY: Record<EmailLocale, { skillGaps: string; viewDetails: string; viewOriginalPosting: string }> = {
  en: {
    skillGaps: 'Skill gaps',
    viewDetails: 'View Details →',
    viewOriginalPosting: 'View Original Posting →',
  },
  zh: {
    skillGaps: '技能差距',
    viewDetails: '查看详情 →',
    viewOriginalPosting: '查看原始职位 →',
  },
};

export function renderMatchEmail({ job, score, appUrl, locale = 'en' }: RenderMatchEmailInput): string {
  const copy = COPY[locale];
  const skillGapHtml = score.skillGap.length
    ? `<p><strong>${copy.skillGaps}:</strong> ${score.skillGap.join(', ')}</p>`
    : '';

  return `
    <h2>${score.score}% Match — ${job.title}</h2>
    <p><strong>${job.company}</strong> · ${job.location}</p>
    <p>${score.reasoning}</p>
    ${skillGapHtml}
    <p><a href="${appUrl}/${locale}/jobs/${job.id}">${copy.viewDetails}</a></p>
    <p><a href="${job.url}">${copy.viewOriginalPosting}</a></p>
  `.trim();
}
