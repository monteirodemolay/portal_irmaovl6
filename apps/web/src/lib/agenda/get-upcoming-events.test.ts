import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), list: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/get-current-session', () => ({ getCurrentSession: mocks.session }));
vi.mock('@vl6/infra', () => ({
  createServerContainer: () => ({ useCases: { listUpcomingEvents: { execute: mocks.list } } }),
}));
import { getUpcomingEventsForPortal } from './get-upcoming-events';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ authContext: { tenantId: 't1', permissions: ['event:read'] } });
});
describe('programação completa do Portal', () => {
  it('carrega todas as páginas, inclusive compromissos além dos 60 primeiros', async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
    mocks.list
      .mockResolvedValueOnce({ items: first, nextCursor: '99', hasMore: true })
      .mockResolvedValueOnce({ items: [{ id: '100' }], nextCursor: null, hasMore: false });
    const events = await getUpcomingEventsForPortal();
    expect(events).toHaveLength(101);
    expect(mocks.list).toHaveBeenNthCalledWith(2, expect.anything(), { limit: 100, cursor: '99' });
  });
  it('não consulta registros sem permissão', async () => {
    mocks.session.mockResolvedValue({ authContext: { permissions: [] } });
    expect(await getUpcomingEventsForPortal()).toEqual([]);
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
