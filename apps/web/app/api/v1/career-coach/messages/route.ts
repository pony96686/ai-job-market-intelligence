import { auth } from '@/lib/auth';
import { prisma, createCareerCoachToolExecutor } from '@ai-job-market-intelligence/db';
import {
  runCareerCoachTurn,
  CareerCoachRateLimitError,
  type CareerCoachMessage,
} from '@ai-job-market-intelligence/ai';
import {
  CareerCoachSendMessageSchema,
  CareerCoachMessageSchema,
  CareerCoachClearResponseSchema,
} from '@ai-job-market-intelligence/shared';
import { CAREER_COACH_HISTORY_CONTEXT_LIMIT } from '@ai-job-market-intelligence/shared/constants';
import { apiSuccess, apiError } from '@/lib/api-response';

// Streamed word-by-word rather than token-by-token — see coach-agent.ts:
// runCareerCoachTurn resolves the full answer (including any tool-calling
// rounds) before this route starts streaming, so this is a progressive
// reveal of an already-known string, not true LLM token streaming.
const STREAM_CHUNK_DELAY_MS = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const messages = await prisma.careerCoachMessage.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  });

  const data = messages.map((m) =>
    CareerCoachMessageSchema.parse({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }),
  );

  return apiSuccess(data);
}

// Hard delete, no conversationId grouping/multi-thread
// — only career_coach_messages, never touches agent_handoffs
// (a separate, V3-only record of "what the agent surfaced when"):
// AgentHandoffTimeline renders straight from
// agent_handoffs.context and doesn't depend on the chat messages it
// references still existing, so clearing history here never breaks it.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  await prisma.careerCoachMessage.deleteMany({ where: { userId: session.user.id } });

  return apiSuccess(CareerCoachClearResponseSchema.parse({ cleared: true }));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const parsed = CareerCoachSendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }

  await prisma.careerCoachMessage.create({
    data: { userId, role: 'USER', content: parsed.data.content },
  });

  const recentMessages = await prisma.careerCoachMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: CAREER_COACH_HISTORY_CONTEXT_LIMIT,
  });
  const history: CareerCoachMessage[] = recentMessages
    .reverse()
    .map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content }));

  let answer: string;
  try {
    answer = await runCareerCoachTurn(history, createCareerCoachToolExecutor(userId));
  } catch (error) {
    if (error instanceof CareerCoachRateLimitError) {
      return apiError('RATE_LIMITED', 429);
    }
    return apiError('INTERNAL_ERROR', 502, undefined, (error as Error).message);
  }

  await prisma.careerCoachMessage.create({
    data: { userId, role: 'ASSISTANT', content: answer },
  });

  const encoder = new TextEncoder();
  const words = answer.split(' ');

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const [i, word] of words.entries()) {
        const delta = i === 0 ? word : ` ${word}`;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, STREAM_CHUNK_DELAY_MS));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
