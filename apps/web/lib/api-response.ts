import { NextResponse } from 'next/server';
import type { ErrorCode } from '@ai-job-market-intelligence/shared';

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Request validation failed',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have access to this resource',
  NOT_FOUND: 'Resource not found',
  PROFILE_INCOMPLETE: 'Please complete onboarding first',
  QUOTA_EXCEEDED: 'Daily scoring quota exceeded',
  BILLING_ERROR: 'Billing provider request failed',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'Something went wrong',
};

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json(meta ? { data, meta } : { data }, { status });
}

export function apiError(code: ErrorCode, status: number, details?: unknown, message?: string) {
  return NextResponse.json(
    { error: { code, message: message ?? ERROR_MESSAGES[code], details } },
    { status },
  );
}
