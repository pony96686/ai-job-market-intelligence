import type { JobListItem, JobResponse, ScoreResponse } from '@ai-job-market-intelligence/shared';

export interface JobsQuery {
  page: number;
  decision?: string;
  minScore?: number;
  sort?: 'score' | 'date';
}

export interface JobsListResult {
  data: JobListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function fetchJobs(query: JobsQuery): Promise<JobsListResult> {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  if (query.decision) params.set('decision', query.decision);
  if (query.minScore) params.set('minScore', String(query.minScore));
  if (query.sort) params.set('sort', query.sort);

  const res = await fetch(`/api/v1/jobs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load jobs');
  return res.json();
}

export async function fetchJob(id: string): Promise<JobResponse> {
  const res = await fetch(`/api/v1/jobs/${id}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'Job not found' : 'Failed to load job');
  const body = await res.json();
  return body.data;
}

export async function fetchJobScore(id: string): Promise<ScoreResponse | null> {
  const res = await fetch(`/api/v1/jobs/${id}/score`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load score');
  const body = await res.json();
  return body.data;
}
