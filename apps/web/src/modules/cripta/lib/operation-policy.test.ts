import { describe, expect, it } from 'vitest';
import { canAcceptRealContent } from './operation-policy';

const window = { opensAt: '2026-10-09T00:00:00Z', closesAt: '2026-10-19T00:00:00Z', status: 'open' as const };

describe('real vault opening policy', () => {
  it('fails closed without explicit rollout, valid window and current time', () => {
    const inside = new Date('2026-10-12T12:00:00Z');
    expect(canAcceptRealContent(undefined, window, inside)).toBe(false);
    expect(canAcceptRealContent('true', null, inside)).toBe(false);
    expect(canAcceptRealContent('true', { ...window, status: 'closed' }, inside)).toBe(false);
    expect(canAcceptRealContent('true', window, new Date('2026-10-19T00:00:00Z'))).toBe(false);
    expect(canAcceptRealContent('true', window, inside)).toBe(true);
  });
  it('rejects invalid and inverted intervals', () => {
    expect(canAcceptRealContent('true', { ...window, opensAt: 'invalid' }, new Date())).toBe(false);
    expect(canAcceptRealContent('true', { ...window, closesAt: window.opensAt }, new Date())).toBe(false);
  });
});
