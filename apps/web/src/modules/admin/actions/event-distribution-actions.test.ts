import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContext } from '@vl6/domain';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  transaction: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/lib/auth/require-session', () => ({ requireSession: mocks.session }));
vi.mock('@vl6/infra', () => ({
  createServerContainer: () => ({
    db: {
      collection: (name: string) => ({ doc: (id = 'audit1') => ({ name, id }) }),
      runTransaction: mocks.transaction,
    },
  }),
}));
import { saveEventDistributionAction } from './event-distribution-actions';
const ctx: AuthContext = {
  uid: 'editor',
  tenantId: 't1',
  roleId: 'editor',
  permissions: ['event:read', 'event:update'],
};
const form = () => {
  const data = new FormData();
  data.set('exibirNaLinhaDoTempo', 'on');
  return data;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ authContext: ctx });
  mocks.get.mockResolvedValue({
    exists: true,
    get: (key: string) => (({ tenantId: 't1', deletedAt: null }) as Record<string, unknown>)[key],
  });
  mocks.transaction.mockImplementation(async (callback) =>
    callback({ get: mocks.get, update: mocks.update, set: mocks.set }),
  );
});
describe('autorização e persistência da distribuição', () => {
  it('nega edição sem event:update antes de acessar o banco', async () => {
    mocks.session.mockResolvedValue({ authContext: { ...ctx, permissions: ['event:read'] } });
    await expect(saveEventDistributionAction('e1', { error: null }, form())).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each(['outro tenant', 'arquivado', 'inexistente'])('nega %s sem escrita', async (scenario) => {
    mocks.get.mockResolvedValue({
      exists: scenario !== 'inexistente',
      get: (key: string) =>
        key === 'tenantId'
          ? scenario === 'outro tenant'
            ? 't2'
            : 't1'
          : key === 'deletedAt' && scenario === 'arquivado'
            ? new Date()
            : null,
    });
    expect((await saveEventDistributionAction('e1', { error: null }, form())).error).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('grava somente exibição/metadados e auditoria com defaults legados na mesma transação', async () => {
    expect((await saveEventDistributionAction('e1', { error: null }, form())).success).toBeTruthy();
    expect(mocks.update.mock.calls[0]![1]).toMatchObject({
      exibirNaTelaInicial: false,
      exibirNaLinhaDoTempo: true,
      updatedBy: 'editor',
    });
    expect(Object.keys(mocks.update.mock.calls[0]![1]).sort()).toEqual([
      'exibirNaLinhaDoTempo',
      'exibirNaTelaInicial',
      'updatedAt',
      'updatedBy',
    ]);
    expect(mocks.set.mock.calls[0]![1]).toMatchObject({
      tenantId: 't1',
      entidadeId: 'e1',
      valorAnterior: { exibirNaTelaInicial: true, exibirNaLinhaDoTempo: true },
      valorNovo: { exibirNaTelaInicial: false, exibirNaLinhaDoTempo: true },
    });
    expect(mocks.revalidate).toHaveBeenCalledWith('/dashboard');
  });
  it('não anuncia sucesso nem revalida se a transação falhar', async () => {
    mocks.transaction.mockRejectedValue(new Error('falha de auditoria'));
    const result = await saveEventDistributionAction('e1', { error: null }, form());
    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
