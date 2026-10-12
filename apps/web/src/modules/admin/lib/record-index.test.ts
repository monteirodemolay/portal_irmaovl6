import { describe, expect, it } from 'vitest';
import { createTtlCache, loadPagesUpTo } from './record-index';

const pager = (total: number, size: number) => async (cursor?: string) => {
  const start = cursor ? Number(cursor) : 0;
  const end = Math.min(start + size, total);
  return {
    items: Array.from({ length: end - start }, (_, i) => start + i),
    hasMore: end < total,
    nextCursor: end < total ? String(end) : null,
  };
};

describe('loadPagesUpTo', () => {
  it('lê tudo quando cabe no limite', async () => {
    const r = await loadPagesUpTo(pager(250, 100), 1000);
    expect(r.items).toHaveLength(250);
    expect(r.truncated).toBe(false);
  });

  it('corta no limite e avisa', async () => {
    const r = await loadPagesUpTo(pager(1000, 100), 300);
    expect(r.items).toHaveLength(300);
    expect(r.truncated).toBe(true);
  });

  it('não entra em laço se o cursor repetir', async () => {
    const r = await loadPagesUpTo(
      async () => ({ items: [1], hasMore: true, nextCursor: 'a' }),
      1000,
    );
    expect(r.truncated).toBe(true);
    expect(r.items.length).toBeLessThanOrEqual(2);
  });
});

describe('createTtlCache', () => {
  it('reaproveita dentro do prazo e recarrega depois', async () => {
    let clock = 0;
    let loads = 0;
    const cache = createTtlCache<number>(1000, () => clock);
    const load = async () => ++loads;
    expect(await cache.get('t', load)).toBe(1);
    clock = 500;
    expect(await cache.get('t', load)).toBe(1);
    clock = 1500;
    expect(await cache.get('t', load)).toBe(2);
  });

  it('separa por chave (tenant)', async () => {
    const cache = createTtlCache<string>(1000);
    expect(await cache.get('a', async () => 'A')).toBe('A');
    expect(await cache.get('b', async () => 'B')).toBe('B');
  });
});
