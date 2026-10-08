import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), state: vi.fn(), member: vi.fn() }));
vi.mock('@/modules/cripta/lib/cripta-route', () => ({
  criptaRoute: (handler: unknown) => handler,
}));
vi.mock('@/lib/auth/require-permission', () => ({ requirePagePermission: mocks.session }));
vi.mock('@vl6/infra', () => ({
  createServerContainer: () => ({ repositories: { member: { findById: mocks.member } } }),
}));
vi.mock('@/modules/cripta/lib/cripta-crypto-state', () => ({ readCriptaPublicKey: mocks.state }));
vi.mock('@/modules/cripta/lib/guardian-shares', () => ({
  currentGuardianShares: () => [{ memberId: 'g1', status: 'comprometida' }],
}));
import { GET } from '../../../app/api/cripta/guardian-file-check/route';
beforeEach(() => {
  mocks.session.mockResolvedValue({ authContext: { tenantId: 'loja' } });
  mocks.state.mockResolvedValue({
    publicKey: { x: 'public' },
    totalGuardians: 5,
    threshold: 3,
    guardianShareDigests: ['digest'],
    secretUnexpected: 'never-expose',
  });
  mocks.member.mockResolvedValue({ tenantId: 'loja', nomeCompleto: 'Guardião' });
});
it('exige credencial administrativa antes de consultar referências', async () => {
  mocks.state.mockClear();
  mocks.session.mockRejectedValueOnce(new Error('denied'));
  await expect(GET()).rejects.toThrow('denied');
  expect(mocks.state).not.toHaveBeenCalled();
  expect(mocks.session).toHaveBeenCalledWith('tenant:manage');
});
it('devolve somente referências públicas da Loja da sessão e sem cache', async () => {
  const response = await GET();
  const data = await response.json();
  expect(mocks.state).toHaveBeenCalledWith('loja');
  expect(data.secretUnexpected).toBeUndefined();
  expect(data.guardians[0]).toEqual({ name: 'Guardião', status: 'comprometida' });
  expect(response.headers.get('Cache-Control')).toContain('no-store');
});
it('não expõe nome de registro de outra Loja e trata Cripta não inaugurada', async () => {
  mocks.member.mockResolvedValue({ tenantId: 'outra', nomeCompleto: 'Não expor' });
  expect(JSON.stringify(await (await GET()).json())).not.toContain('Não expor');
  mocks.state.mockResolvedValue(null);
  expect((await GET()).status).toBe(409);
});
