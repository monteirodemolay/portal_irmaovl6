import { beforeEach, describe, expect, it, vi } from 'vitest';

/** The downloadable list carried, by hand, into the offline Renovação tool — proves it only
 * includes Ativos com conta vinculada, excludes the Venerável, and carries nothing beyond
 * name/id (no secret, nothing that needs protecting in transit). */

const harness = vi.hoisted(() => ({
  session: vi.fn(),
  master: vi.fn(),
  search: vi.fn(),
}));

vi.mock('@/modules/cripta/lib/cripta-route', () => ({ criptaRoute: (handler: unknown) => handler }));
vi.mock('@vl6/infra', () => ({ createServerContainer: () => ({ repositories: { member: { search: harness.search } } }) }));
vi.mock('@/lib/auth/require-permission', () => ({ requirePagePermission: harness.session }));
vi.mock('@/modules/cripta/lib/current-master', () => ({ currentCriptaMaster: harness.master }));

import { GET } from '../../../app/api/cripta/eligible-members/route';

const TENANT = 'tenant-1';

beforeEach(() => {
  harness.session.mockResolvedValue({ authContext: { tenantId: TENANT } });
  harness.master.mockResolvedValue({ member: { id: 'master-1', nomeCompleto: 'Venerável' }, termId: 'term-1' });
  harness.search.mockResolvedValue({
    items: [
      { id: 'master-1', userId: 'uid-master', nomeCompleto: 'Venerável' },
      { id: 'm1', userId: 'uid-1', nomeCompleto: 'Fulano' },
      { id: 'm2', userId: null, nomeCompleto: 'Sem conta vinculada' },
      { id: 'm3', userId: 'uid-3', nomeCompleto: 'Beltrano' },
    ],
  });
});

describe('GET /api/cripta/eligible-members', () => {
  it('lista só Ativos com conta vinculada, sem o Venerável', async () => {
    const body = (await (await GET()).json()) as { members: Array<{ id: string; nome: string }> };
    expect(body.members).toEqual([
      { id: 'm1', nome: 'Fulano' },
      { id: 'm3', nome: 'Beltrano' },
    ]);
  });
});
