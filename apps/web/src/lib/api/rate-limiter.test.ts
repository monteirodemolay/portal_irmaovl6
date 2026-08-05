import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite requisições até o limite dentro da janela', () => {
    const limiter = new RateLimiter();
    const opts = { limit: 3, windowMs: 60_000 };

    expect(limiter.check('ip-1', opts).allowed).toBe(true);
    expect(limiter.check('ip-1', opts).allowed).toBe(true);
    expect(limiter.check('ip-1', opts).allowed).toBe(true);
  });

  it('nega a requisição que excede o limite, com retryAfterMs', () => {
    const limiter = new RateLimiter();
    const opts = { limit: 2, windowMs: 60_000 };

    limiter.check('ip-1', opts);
    limiter.check('ip-1', opts);
    const result = limiter.check('ip-1', opts);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it('reseta a contagem depois que a janela expira', () => {
    const limiter = new RateLimiter();
    const opts = { limit: 1, windowMs: 1_000 };

    expect(limiter.check('ip-1', opts).allowed).toBe(true);
    expect(limiter.check('ip-1', opts).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect(limiter.check('ip-1', opts).allowed).toBe(true);
  });

  it('mantém contadores independentes por chave', () => {
    const limiter = new RateLimiter();
    const opts = { limit: 1, windowMs: 60_000 };

    expect(limiter.check('ip-1', opts).allowed).toBe(true);
    expect(limiter.check('ip-2', opts).allowed).toBe(true);
    expect(limiter.check('ip-1', opts).allowed).toBe(false);
  });
});
