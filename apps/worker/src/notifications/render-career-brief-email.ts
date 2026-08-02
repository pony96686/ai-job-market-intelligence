import type { CareerBriefSummary } from '@ai-job-market-intelligence/shared';

export type EmailLocale = 'en' | 'zh';

interface RenderCareerBriefEmailInput {
  summary: CareerBriefSummary;
  appUrl: string;
  locale?: EmailLocale;
}

const COPY: Record<
  EmailLocale,
  {
    subject: string;
    growingSkills: string;
    hotCompanies: string;
    recommendedJobs: string;
    recommendedSkill: string;
    openJobs: string;
    activeJobs: string;
  }
> = {
  en: {
    subject: '📈 Your Daily Career Brief',
    growingSkills: 'Fastest-growing skills',
    hotCompanies: 'Hiring the most right now',
    recommendedJobs: 'New high matches for you',
    recommendedSkill: 'A skill worth learning next',
    openJobs: 'Open jobs',
    activeJobs: 'active postings',
  },
  zh: {
    subject: '📈 你的每日职业简报',
    growingSkills: '增长最快的技能',
    hotCompanies: '当前招聘量最大的公司',
    recommendedJobs: '为你发现的新高分机会',
    recommendedSkill: '值得学习的下一个技能',
    openJobs: '在招职位',
    activeJobs: '个在招职位',
  },
};

function growthBadge(growthPercent: number | null): string {
  if (growthPercent === null) return '';
  const sign = growthPercent >= 0 ? '+' : '';
  return ` (${sign}${growthPercent.toFixed(0)}%)`;
}

export function renderCareerBriefEmail({
  summary,
  appUrl,
  locale = 'en',
}: RenderCareerBriefEmailInput): string {
  const copy = COPY[locale];

  const skillsHtml = summary.marketHighlights.topGrowingSkills
    .map(
      (s) => `<li>${s.name} — ${s.jobCount} ${copy.openJobs}${growthBadge(s.growthPercent)}</li>`,
    )
    .join('');

  const companiesHtml = summary.marketHighlights.hotCompanies
    .map(
      (c) =>
        `<li>${c.company} — ${c.activeJobCount} ${copy.activeJobs}${growthBadge(c.growthPercent)}</li>`,
    )
    .join('');

  const jobsHtml = summary.recommendedJobs
    .map(
      (j) =>
        `<li><a href="${appUrl}/${locale}/jobs/${j.jobId}">${j.title}</a> at ${j.company} — ${j.score}% match</li>`,
    )
    .join('');

  const skillHtml = summary.recommendedSkill
    ? `<p><strong>${copy.recommendedSkill}:</strong> ${summary.recommendedSkill.name} (${summary.recommendedSkill.jobCount} ${copy.openJobs}${growthBadge(summary.recommendedSkill.growthPercent)})</p>`
    : '';

  return `
    <h2>${copy.subject}</h2>
    ${skillsHtml ? `<h3>${copy.growingSkills}</h3><ul>${skillsHtml}</ul>` : ''}
    ${companiesHtml ? `<h3>${copy.hotCompanies}</h3><ul>${companiesHtml}</ul>` : ''}
    ${jobsHtml ? `<h3>${copy.recommendedJobs}</h3><ul>${jobsHtml}</ul>` : ''}
    ${skillHtml}
    <p><a href="${appUrl}/${locale}/dashboard">${copy.recommendedJobs} →</a></p>
  `.trim();
}
