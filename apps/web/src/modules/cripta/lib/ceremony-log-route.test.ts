import { beforeEach, describe, expect, it, vi } from 'vitest';

/** The ceremony log is a pure reader joining three already-existing event subcollections
 * (criptaCryptoV1 for inauguração/sorteio, criptaOnlineOpeningV1 for abertura/fechamento,
 * criptaSealsV1 for lacração) — this proves it reads the right ones for each ceremony, in order,
 * without ever writing. */

type Data = Record<string, unknown>;
const harness = vi.hoisted(() => {
  const events = new Map<string, Data[]>();
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
  return { events, session: vi.fn(), db: { collection } };
});

vi.mock('@/modules/cripta/lib/cripta-route', () => ({ criptaRoute: (handler: unknown) => handler }));
vi.mock('@vl6/infra', () => ({ getAdminFirestore: () => harness.db }));
vi.mock('@/lib/auth/require-permission', () => ({ requirePagePermission: harness.session }));
vi.mock('@/modules/cripta/lib/cripta-crypto-state', () => ({
  criptaCryptoRef: (tenantId: string) => harness.db.collection('criptaCryptoV1').doc(tenantId),
}));
vi.mock('@/modules/cripta/lib/online-opening', () => ({
  openingRef: (tenantId: string) => harness.db.collection('criptaOnlineOpeningV1').doc(tenantId),
}));
vi.mock('@/modules/cripta/lib/seal-state', () => ({
  sealRef: (tenantId: string) => harness.db.collection('criptaSealsV1').doc(tenantId),
}));

import { GET } from '../../../app/api/cripta/ceremony-log/route';

const TENANT = 'tenant-1';
const request = (ceremony: string) =>
  new Request(`https://portal.example/api/cripta/ceremony-log?ceremony=${ceremony}`);

beforeEach(() => {
  harness.events.clear();
  harness.session.mockResolvedValue({ authContext: { tenantId: TENANT } });
  harness.events.set('criptaCryptoV1/events', [
    { type: 'sorteio.resultado', at: '2026-01-01T10:00:00.000Z' },
    { type: 'inaugurated', at: '2026-01-01T10:05:00.000Z' },
  ]);
  harness.events.set('criptaOnlineOpeningV1/events', [
    { type: 'opened', at: '2026-02-01T10:00:00.000Z' },
    { type: 'closed', at: '2026-02-11T10:00:00.000Z' },
  ]);
  harness.events.set('criptaSealsV1/events', [{ type: 'sealed', at: '2026-02-12T10:00:00.000Z' }]);
});

describe('agregador de log de cerimônia', () => {
  it('rejeita cerimônia desconhecida ou ausente', async () => {
    expect((await GET(request('festa'))).status).toBe(400);
    expect((await GET(new Request('https://portal.example/api/cripta/ceremony-log'))).status).toBe(400);
  });

  it('inauguração lê sorteio e inauguração, em ordem', async () => {
    const body = (await (await GET(request('inauguracao'))).json()) as { events: Array<{ type: string }> };
    expect(body.events.map((event) => event.type)).toEqual(['sorteio.resultado', 'inaugurated']);
  });

  it('abertura e reabertura mostram só os eventos de abertura, não os de fechamento', async () => {
    for (const ceremony of ['abertura', 'reabertura']) {
      const body = (await (await GET(request(ceremony))).json()) as { events: Array<{ type: string }> };
      expect(body.events.map((event) => event.type)).toEqual(['opened']);
    }
  });

  it('fechamento junta o fechamento da abertura com a lacração, sem a abertura em si', async () => {
    const body = (await (await GET(request('fechamento'))).json()) as { events: Array<{ type: string }> };
    expect(body.events.map((event) => event.type)).toEqual(['closed', 'sealed']);
  });
});
