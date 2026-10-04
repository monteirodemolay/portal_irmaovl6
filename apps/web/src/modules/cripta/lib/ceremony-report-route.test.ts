import { beforeEach, describe, expect, it, vi } from 'vitest';

/** The relatório para o registro histórico is built fresh from the same event sources the Projetor reads, with
 * member names resolved only at report time — proves it names participants correctly and never
 * leaks letter content or ficha data, which never appear in ceremony events at all. */

type Data = Record<string, unknown>;
const harness = vi.hoisted(() => {
  const events = new Map<string, Data[]>();
  const members = new Map<string, Data>();
  const collection = (name: string) => ({
    doc: (_tenantId: string) => ({
      collection: (child: string) => ({
        get: async () => ({
          docs: (events.get(`${name}/${child}`) ?? []).map((data, index) => ({
            id: `${name}-${index}`,
            data: () => data,
          })),
        }),
      }),
    }),
  });
  return {
    events,
    members,
    session: vi.fn(),
    db: { collection },
    findById: vi.fn(async (id: string) => members.get(id)),
  };
});

vi.mock('server-only', () => ({}));
vi.mock('@/modules/cripta/lib/ceremony-events', async () => import('./ceremony-events'));
vi.mock('@/modules/cripta/lib/cripta-route', () => ({ criptaRoute: (handler: unknown) => handler }));
vi.mock('@vl6/infra', () => ({
  getAdminFirestore: () => harness.db,
  createServerContainer: () => ({ repositories: { member: { findById: harness.findById } } }),
}));
vi.mock('@/lib/auth/require-permission', () => ({ requirePagePermission: harness.session }));
vi.mock('./cripta-crypto-state', () => ({
  criptaCryptoRef: (tenantId: string) => harness.db.collection('criptaCryptoV1').doc(tenantId),
}));
vi.mock('./online-opening', () => ({
  openingRef: (tenantId: string) => harness.db.collection('criptaOnlineOpeningV1').doc(tenantId),
}));
vi.mock('./seal-state', () => ({
  sealRef: (tenantId: string) => harness.db.collection('criptaSealsV1').doc(tenantId),
}));

import { GET } from '../../../app/api/cripta/ceremony-report/route';

const TENANT = 'tenant-1';
const request = (ceremony: string) =>
  new Request(`https://portal.example/api/cripta/ceremony-report?ceremony=${ceremony}`);

beforeEach(() => {
  harness.events.clear();
  harness.members.clear();
  harness.session.mockResolvedValue({ authContext: { tenantId: TENANT } });
  harness.members.set('master-1', { nomeCompleto: 'Fulano Venerável' });
  harness.members.set('m1', { nomeCompleto: 'Beltrano Guardião' });
  harness.events.set('criptaCryptoV1/events', [
    {
      type: 'sorteio.resultado',
      at: '2026-01-01T10:00:00.000Z',
      guardianMemberIds: ['m1'],
      presentMemberIds: ['m1'],
    },
    {
      type: 'inaugurated',
      at: '2026-01-01T10:05:00.000Z',
      masterId: 'master-1',
      minutes: 'Ata 10/2026',
    },
  ]);
});

describe('relatório para o registro histórico', () => {
  it('rejeita cerimônia inválida', async () => {
    expect((await GET(request('festa'))).status).toBe(400);
  });

  it('monta HTML com nomes resolvidos, sem expor dado de carta', async () => {
    const response = await GET(request('inauguracao'));
    const html = await response.text();
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(html).toContain('Beltrano Guardião');
    expect(html).toContain('Fulano Venerável');
    expect(html).toContain('Ata 10/2026');
    expect(html).not.toContain('carta.body');
  });

  it('nunca lista o uid de quem agiu (actorId) nem o id da Gestão (masterTermId) como participante', async () => {
    harness.events.set('criptaCryptoV1/events', [
      {
        type: 'inaugurated',
        at: '2026-01-01T10:05:00.000Z',
        masterId: 'master-1',
        minutes: 'Ata 10/2026',
        actorId: 'firebase-uid-abc123',
        masterTermId: 'term-xyz789',
      },
    ]);
    const html = await (await GET(request('inauguracao'))).text();
    expect(html).toContain('Fulano Venerável');
    expect(html).not.toContain('firebase-uid-abc123');
    expect(html).not.toContain('term-xyz789');
  });

  it('inclui a designação da Comissão de Guarda nos eventos de abertura/reabertura', async () => {
    harness.events.set('criptaGovernanceV1/events', [
      {
        type: 'commission-appointed',
        at: '2026-01-15T10:00:00.000Z',
        commissionMemberIds: ['m1'],
        minutes: 'Ata 05/2026',
      },
    ]);
    harness.events.set('criptaOnlineOpeningV1/events', [
      { type: 'opened', at: '2026-02-01T10:00:00.000Z' },
    ]);
    const html = await (await GET(request('abertura'))).text();
    expect(html).toContain('Comissão de Guarda nomeada');
    expect(html).toContain('Beltrano Guardião');
    expect(html).toContain('Ata 05/2026');
  });
});
