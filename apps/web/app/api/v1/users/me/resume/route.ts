import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { prisma } from '@ai-job-market-intelligence/db';
import { extractResumeText } from '@ai-job-market-intelligence/ai';
import { enqueueProfileParse } from '@ai-job-market-intelligence/shared/queue';

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'text/plain']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('resume');
  if (!(file instanceof File)) {
    return apiError('VALIDATION_ERROR', 400, undefined, 'Missing resume file');
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return apiError('VALIDATION_ERROR', 400, undefined, 'Resume must be a PDF or plain text file');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return apiError('VALIDATION_ERROR', 400, undefined, 'Resume file exceeds the 5MB limit');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Text is extracted here and only the extracted text is queued — the
  // uploaded file itself is never persisted or forwarded (resume source text
  // must not be stored).
  const resumeText = await extractResumeText(buffer, file.type);

  // Set PENDING synchronously (before enqueue) so the frontend can show a
  // "processing" state immediately via GET career-profile, without waiting
  // for the worker to even pick up the job.
  await prisma.careerProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, resumeParseStatus: 'PENDING' },
    update: { resumeParseStatus: 'PENDING' },
  });

  await enqueueProfileParse({ userId: session.user.id, source: 'resume', resumeText });

  return apiSuccess({ message: 'Resume uploaded, parsing in progress' });
}
