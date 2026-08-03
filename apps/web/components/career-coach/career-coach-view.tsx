'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCareerCoachHistory,
  sendCareerCoachMessage,
  clearCareerCoachHistory,
  CareerCoachSendError,
} from '@/lib/api/career-agent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

interface ChatMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export function CareerCoachView() {
  const t = useTranslations('careerCoach');
  const queryClient = useQueryClient();

  const { data: history, isLoading } = useQuery({
    queryKey: ['career-coach-history'],
    queryFn: fetchCareerCoachHistory,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<'rateLimited' | 'generic' | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated && history) {
      setMessages(history.map((m) => ({ role: m.role, content: m.content })));
      setHydrated(true);
    }
  }, [history, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const content = input.trim();
    if (!content || isSending) return;

    setInput('');
    setError(null);
    setIsSending(true);
    setMessages((prev) => [...prev, { role: 'USER', content }, { role: 'ASSISTANT', content: '' }]);

    try {
      await sendCareerCoachMessage(content, (delta) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1]!;
          next[next.length - 1] = { ...last, content: last.content + delta };
          return next;
        });
      });
    } catch (err) {
      // Drop the empty ASSISTANT placeholder — no content ever arrived, so
      // showing a permanently-empty bubble reads as "still thinking".
      setMessages((prev) => prev.slice(0, -1));
      setError(
        err instanceof CareerCoachSendError && err.code === 'RATE_LIMITED'
          ? 'rateLimited'
          : 'generic',
      );
    } finally {
      setIsSending(false);
    }
  }

  // Hard delete, irreversible — no undo, no conversationId/multi-thread
  // concept.
  async function handleClear() {
    setIsClearing(true);
    try {
      await clearCareerCoachHistory();
      setMessages([]);
      setError(null);
      queryClient.setQueryData(['career-coach-history'], []);
      setClearDialogOpen(false);
    } catch {
      setError('generic');
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={messages.length === 0}>
              {t('clearConversation')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{t('clearConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('clearConfirmDescription')}</DialogDescription>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isClearing}>
                  {t('clearCancel')}
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => void handleClear()}
                disabled={isClearing}
              >
                {t('clearConfirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-md border border-border p-4">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('emptyState')}</p>
        ) : (
          messages.map((message, i) => (
            <div key={i} className={message.role === 'USER' ? 'text-right' : 'text-left'}>
              <span
                className={
                  message.role === 'USER'
                    ? 'inline-block max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                    : 'inline-block max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm'
                }
              >
                {message.content || '…'}
              </span>
            </div>
          ))
        )}
        {error && (
          <p className="text-sm text-destructive">
            {error === 'rateLimited' ? t('rateLimited') : t('sendFailed')}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder={t('placeholder')}
          disabled={isSending}
        />
        <Button onClick={() => void handleSend()} disabled={isSending || !input.trim()}>
          {t('send')}
        </Button>
      </div>
    </div>
  );
}
