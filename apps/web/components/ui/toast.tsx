'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Toast {
  id: number;
  message: string;
  variant: 'default' | 'success' | 'destructive';
}

type ToastFn = (message: string, variant?: Toast['variant']) => void;

const ToastContext = React.createContext<ToastFn | null>(null);

const TOAST_DURATION_MS = 4000;

// Minimal, dependency-free toast — this app has no other transient
// notification mechanism, and a single-purpose component like this doesn't
// justify pulling in a full toast library for one call site.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const toast = React.useCallback<ToastFn>((message, variant = 'default') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto rounded-md border border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-md',
              t.variant === 'success' && 'border-green-500/50 text-green-700',
              t.variant === 'destructive' && 'border-destructive/50 text-destructive',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const toast = React.useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used within a ToastProvider');
  return toast;
}
