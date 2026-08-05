import { NextResponse } from 'next/server';
import type { RateLimitResult } from './rate-limiter';

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.ceil((result.retryAfterMs ?? 0) / 1000);
  return NextResponse.json(
    { error: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
