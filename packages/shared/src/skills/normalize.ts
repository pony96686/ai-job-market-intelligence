import { SKILL_SYNONYMS } from './synonyms';

export interface NormalizedSkill {
  slug: string;
  name: string;
}

// Display names for canonical slugs that don't title-case cleanly on their
// own (acronyms, punctuation, mixed case) — anything not listed here falls
// back to a generic slug -> title-case conversion.
const DISPLAY_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  csharp: 'C#',
  cpp: 'C++',
  ruby: 'Ruby',
  rust: 'Rust',
  kotlin: 'Kotlin',
  swift: 'Swift',
  php: 'PHP',
  java: 'Java',
  scala: 'Scala',
  elixir: 'Elixir',
  'node.js': 'Node.js',
  express: 'Express',
  nestjs: 'NestJS',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  rails: 'Ruby on Rails',
  spring: 'Spring',
  laravel: 'Laravel',
  react: 'React',
  vue: 'Vue',
  angular: 'Angular',
  svelte: 'Svelte',
  'next.js': 'Next.js',
  nuxt: 'Nuxt',
  'full-stack': 'Full-Stack',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  redis: 'Redis',
  sqlite: 'SQLite',
  dynamodb: 'DynamoDB',
  cassandra: 'Cassandra',
  elasticsearch: 'Elasticsearch',
  kubernetes: 'Kubernetes',
  docker: 'Docker',
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'Azure',
  terraform: 'Terraform',
  ansible: 'Ansible',
  'ci-cd': 'CI/CD',
  devops: 'DevOps',
  sre: 'SRE',
  'machine-learning': 'Machine Learning',
  'artificial-intelligence': 'Artificial Intelligence',
  llm: 'LLM',
  pytorch: 'PyTorch',
  tensorflow: 'TensorFlow',
  nlp: 'NLP',
  graphql: 'GraphQL',
  'rest-api': 'REST API',
  microservices: 'Microservices',
  grpc: 'gRPC',
};

function toTitleCase(slug: string): string {
  return slug
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function lookup(token: string): NormalizedSkill | null {
  const slug = SKILL_SYNONYMS[token];
  if (!slug) return null;
  return { slug, name: DISPLAY_NAMES[slug] ?? toTitleCase(slug) };
}

// Tokens shorter than this never enter the tokenization fallback below —
// short skill names ("go", "r") are common English words/letters on their
// own, so "go-getter" splitting into "go" would false-positive as the Go
// language. Those short names can still match, just only via the whole-tag
// exact-match tier, never via a split token (v2-scope.md §8 Epic 10.1).
const MIN_FALLBACK_TOKEN_LENGTH = 3;

// jobs.skills entries are already lowercased/trimmed by AI Job Parsing or
// extractTagsAsSkills (job-ingestion.md §5.1). SKILL_SYNONYMS doubles as a
// manually maintained skill whitelist, kept as exact-match only per
// roadmap.md's "人工维护、不做运行时学习" constraint — no fuzzy/edit-distance
// matching. Two tiers:
//   1. Whole tag exact match (single-word tags, known multi-word phrases
//      like "machine learning").
//   2. If that misses, split the tag on -/ /whitespace and exact-match each
//      token — extractTagsAsSkills copies raw source tags verbatim, and
//      those are frequently compound job-title phrases ("senior-azure-devops-engineer")
//      that bury a real skill token ("azure", "devops") next to noise
//      words ("senior", "engineer") that simply aren't in the whitelist and
//      get discarded naturally. A tag that matches neither tier contributes
//      nothing (v2-scope.md §8 Epic 10.1).
export function normalizeSkill(raw: string): NormalizedSkill[] {
  const cleaned = raw.toLowerCase().trim();

  const wholeMatch = lookup(cleaned);
  if (wholeMatch) return [wholeMatch];

  const seen = new Set<string>();
  const results: NormalizedSkill[] = [];
  for (const token of cleaned.split(/[-/\s]+/)) {
    if (token.length < MIN_FALLBACK_TOKEN_LENGTH) continue;
    const match = lookup(token);
    if (!match || seen.has(match.slug)) continue;
    seen.add(match.slug);
    results.push(match);
  }
  return results;
}
