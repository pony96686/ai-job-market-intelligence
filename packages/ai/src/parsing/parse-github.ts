import { z } from 'zod';
import { Octokit } from '@octokit/rest';
import { getOpenRouterClient } from '../openrouter-client';
import { GITHUB_SUMMARY_SYSTEM_PROMPT, buildGithubSummaryUserPrompt } from '../prompts/github-summary';

const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
const MAX_REPOS_FOR_LANGUAGES = 15;
const MAX_REPOS_FOR_README = 3;

const GithubSummaryOutputSchema = z.object({
  summary: z.string().min(1).max(1000),
});

export interface GithubParseResult {
  languages: Record<string, number>;
  summary: string | null;
}

let octokit: Octokit | undefined;

function getOctokit(): Octokit {
  octokit ??= new Octokit({ auth: process.env.GITHUB_TOKEN });
  return octokit;
}


async function fetchReadmeExcerpt(owner: string, repo: string): Promise<string | null> {
  try {
    const { data } = await getOctokit().rest.repos.getReadme({ owner, repo });
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

async function summarizeRepos(
  username: string,
  repos: { name: string; description: string | null; readmeExcerpt: string | null }[],
): Promise<string | null> {
  if (repos.length === 0) return null;

  try {
    const response = await getOpenRouterClient().chat.completions.create({
      model: process.env.CHAT_MODEL ?? DEFAULT_LLM_MODEL,
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: GITHUB_SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: buildGithubSummaryUserPrompt(username, repos) },
      ],
    });

    const content = response.choices[0]?.message.content;
    if (!content) return null;

    return GithubSummaryOutputSchema.parse(JSON.parse(content)).summary;
  } catch {
    return null;
  }
}

// Uses only the public GitHub REST API (no OAuth) — GITHUB_TOKEN is a PAT used
// solely to raise the rate limit (60/h unauthenticated -> 5000/h), not to
// access anything private. Returns null on any failure (user not found, rate
// limited) so the caller can proceed without blocking the rest of profile
// parsing.
export async function fetchGithubProfile(username: string): Promise<GithubParseResult | null> {
  let repos;
  try {
    const { data } = await getOctokit().rest.repos.listForUser({
      username,
      sort: 'updated',
      per_page: MAX_REPOS_FOR_LANGUAGES,
    });
    repos = data.filter((r) => !r.fork);
  } catch {
    return null;
  }

  if (repos.length === 0) {
    return { languages: {}, summary: null };
  }

  const languageResults = await Promise.all(
    repos.map(async (repo) => {
      try {
        const { data } = await getOctokit().rest.repos.listLanguages({
          owner: username,
          repo: repo.name,
        });
        return data;
      } catch {
        return {};
      }
    }),
  );

  const languages: Record<string, number> = {};
  for (const result of languageResults) {
    for (const [lang, bytes] of Object.entries(result)) {
      languages[lang] = (languages[lang] ?? 0) + bytes;
    }
  }

  const readmeRepos = repos.slice(0, MAX_REPOS_FOR_README);
  const reposWithReadme = await Promise.all(
    readmeRepos.map(async (repo) => ({
      name: repo.name,
      description: repo.description,
      readmeExcerpt: await fetchReadmeExcerpt(username, repo.name),
    })),
  );

  const summary = await summarizeRepos(username, reposWithReadme);

  return { languages, summary };
}
