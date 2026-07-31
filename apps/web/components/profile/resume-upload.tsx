'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { uploadResume } from '@/lib/api/user';
import { useCareerProfile } from './use-career-profile';

const ACCEPTED_TYPES = '.pdf,.txt,application/pdf,text/plain';

export function ResumeUpload() {
  const t = useTranslations('resume');
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { data, resumeTakingLonger } = useCareerProfile();
  const resume = data?.resume;

  const mutation = useMutation({
    mutationFn: uploadResume,
    onSuccess: () => {
      // The route sets resumeParseStatus=PENDING synchronously before
      // enqueueing, so invalidating here immediately
      // flips the UI into the Parsing state instead of waiting on the
      // worker to pick up the job.
      queryClient.invalidateQueries({ queryKey: ['career-profile'] });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setExpanded(false);
    mutation.mutate(file);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={mutation.isPending}>
        {mutation.isPending ? t('uploading') : t('uploadButton')}
      </Button>
      {fileName && !mutation.isPending && !mutation.isError && (
        <p className="text-sm text-muted-foreground">{t('uploaded', { fileName })}</p>
      )}
      {mutation.isError && <p className="text-sm text-destructive">{t('uploadFailed')}</p>}

      {resume?.status === 'PENDING' && (
        <p className="text-sm text-muted-foreground">
          {t('parsing')}
          {resumeTakingLonger && <span className="block">{t('takingLonger')}</span>}
        </p>
      )}

      {resume?.status === 'FAILED' && <p className="text-sm text-destructive">{t('parseFailed')}</p>}

      {resume?.status === 'SUCCESS' && (
        <div className="space-y-1.5 text-sm" data-testid="resume-parsed">
          <p className="font-medium text-foreground">{t('parsedHeading')}</p>
          {resume.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
          {resume.experienceYears !== null && (
            <p className="text-muted-foreground">{t('yearsOfExperience', { years: resume.experienceYears })}</p>
          )}
          {resume.summary && (
            <p className={expanded ? 'text-muted-foreground' : 'text-muted-foreground line-clamp-2'}>
              {resume.summary}
            </p>
          )}
          {resume.summary && resume.summary.length > 160 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {expanded ? t('showLess') : t('showMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
