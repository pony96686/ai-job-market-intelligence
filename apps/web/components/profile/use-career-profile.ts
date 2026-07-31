'use client';

import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCareerProfile } from '@/lib/api/user';

const POLL_INTERVAL_MS = 3000;
// No max poll count (PENDING can't get stuck forever — the worker always
// resolves to SUCCESS/FAILED), but a soft "this is taking longer than
// expected" notice after 60s so the user isn't left staring at a spinner
// with no signal.
const SOFT_TIMEOUT_MS = 60_000;

// Resume and github parse feedback poll and display independently of each
// other, but share one GET career-profile query.
export function useCareerProfile() {
  const pendingSince = useRef<{ resume: number | null; github: number | null }>({ resume: null, github: null });

  const query = useQuery({
    queryKey: ['career-profile'],
    queryFn: fetchCareerProfile,
    refetchInterval: (q) => {
      const resumePending = q.state.data?.resume.status === 'PENDING';
      const githubPending = q.state.data?.github.status === 'PENDING';
      return resumePending || githubPending ? POLL_INTERVAL_MS : false;
    },
  });

  const now = Date.now();
  const resumeStatus = query.data?.resume.status;
  const githubStatus = query.data?.github.status;

  pendingSince.current.resume = resumeStatus === 'PENDING' ? (pendingSince.current.resume ?? now) : null;
  pendingSince.current.github = githubStatus === 'PENDING' ? (pendingSince.current.github ?? now) : null;

  const resumeTakingLonger = pendingSince.current.resume !== null && now - pendingSince.current.resume >= SOFT_TIMEOUT_MS;
  const githubTakingLonger = pendingSince.current.github !== null && now - pendingSince.current.github >= SOFT_TIMEOUT_MS;

  return {
    data: query.data,
    isLoading: query.isLoading,
    resumeTakingLonger,
    githubTakingLonger,
  };
}
