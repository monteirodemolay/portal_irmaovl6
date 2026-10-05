import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Drives the real /api/cripta/ceremony-draw handler: the Guardian lottery must pick exactly 5
 * distinct eligible presentes, reject anyone not Ativo/linked or the Venerável himself, log the
 * draw as an event (so it survives for the registro histórico), and refuse once the Cripta is already
 * inaugurated — the draw is a one-time act, same as the inauguration it feeds. */

type Data = Record<string, unknown>;
const harness = vi.hoisted(() => {
  const created: Data[] = [];
  const members = new Map<string, Data>();
  const harness_state: { inaugurated: Data | undefined } = { inaugurated: undefined };
  const db = {
    collection: (name: string) => ({
      doc: (_tenantId: string) => ({
        get: async () => ({ data: () => (name === 'criptaCryptoV1' ? harness_state.inaugurated : undefined) }),
        collection: (_child: string) => ({
          doc: () => ({ create: async (value: Data) => { created.push(value); } }),
        }),
      }),
    }),
  };
  return {
    created,
    members,
    db,
    state: harness_state,
    session: vi.fn(),
    master: vi.fn(),
    findById: vi.fn(async (id: string) => members.get(id)),
  };
});

vi.mock('@/modules/cripta/lib/cripta-route', () => ({ criptaRoute: (handler: unknown) => handler }));
vi.mock('@vl6/infra', () => ({
  getAdminFirestore: () => harness.db,
  createServerContainer: () => ({ repositories: { member: { findById: harness.findById } } }),
}));
vi.mock('@/lib/auth/require-permission', () => ({ requirePagePermission: harness.session }));
vi.mock('@/modules/cripta/lib/current-master', () => ({ currentCriptaMaster: harness.master }));
vi.mock('@/modules/cripta/lib/cripta-crypto-state', () => ({
  criptaCryptoRef: (tenantId: string) => harness.db.collection('criptaCryptoV1').doc(tenantId),
  readCriptaPublicKey: async () => harness.state.inaugurated ?? null,
}));

import { POST } from '../../../app/api/cripta/ceremony-draw/route';

const TENANT = 'tenant-1';
const request = (body: Record<string, unknown>) =>
  new Request('https://portal.example/api/cripta/ceremony-draw', {
    method: 'POST',
    headers: { Origin: 'https://portal.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

function addMember(id: string, overrides: Partial<Data> = {}) {
  harness.members.set(id, {
    id,
    tenantId: TENANT,
    situacao: 'ativo',
    userId: `uid-${id}`,
    nomeCompleto: id,
    ...overrides,
  });
}

beforeEach(() => {
  harness.created.length = 0;
  harness.members.clear();
  harness.state.inaugurated = undefined;
  harness.session.mockResolvedValue({ user: { id: 'operator-1' }, authContext: { tenantId: TENANT } });
  harness.master.mockResolvedValue({ member: { id: 'master-1', nomeCompleto: 'Venerável' }, termId: 'term-1' });
  for (const id of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']) addMember(id);
});

describe('sorteio de Guardiões', () => {
  it('sorteia exatamente 5 presentes distintos e registra o evento', async () => {
    const response = await POST(
      request({ presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] }),
    );
    const body = (await response.json()) as { result?: { guardianMemberIds: string[] } };
    expect(response.status).toBe(201);
    expect(body.result!.guardianMemberIds).toHaveLength(5);
    expect(new Set(body.result!.guardianMemberIds).size).toBe(5);
    for (const id of body.result!.guardianMemberIds) expect(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']).toContain(id);
    expect(harness.created).toHaveLength(1);
    expect(harness.created[0]).toMatchObject({ type: 'sorteio.resultado' });
  });

  it('marca sortear de novo como um tipo de evento distinto', async () => {
    await POST(request({ presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] }));
    await POST(request({ presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'], redraw: true }));
    expect(harness.created.map((event) => event.type)).toEqual(['sorteio.resultado', 'sorteio.redraw']);
  });

  it('rejeita menos de 5 presentes ou repetidos', async () => {
    expect((await POST(request({ presentMemberIds: ['m1', 'm2'] }))).status).toBe(400);
    expect((await POST(request({ presentMemberIds: ['m1', 'm1', 'm2', 'm3', 'm4'] }))).status).toBe(400);
    expect(harness.created).toHaveLength(0);
  });

  it('rejeita presente inativo, sem conta vinculada, ou o próprio Venerável', async () => {
    addMember('inativo', { situacao: 'desligado' });
    expect(
      (await POST(request({ presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'inativo'] }))).status,
    ).toBe(400);
    expect(
      (await POST(request({ presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'master-1'] }))).status,
    ).toBe(400);
    expect(harness.created).toHaveLength(0);
  });

  it('nega sortear depois que a Cripta já foi inaugurada', async () => {
    harness.state.inaugurated = { publicKey: { x: 'x', y: 'y' }, inauguratedAt: '2026-01-01' };
    const response = await POST(request({ presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'm5'] }));
    expect(response.status).toBe(409);
    expect(harness.created).toHaveLength(0);
  });
});
