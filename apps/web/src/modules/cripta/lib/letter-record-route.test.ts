import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Drives the real /api/cripta/letter-records handlers against a fake Firestore: a Irmão must
 * see only their own fichas, and must be able to retain, reactivate or change delivery mode
 * without ever touching the sealed ciphertext (which this route never imports). */

type Data = Record<string, unknown>;
type Ref = { path: string; get: () => Promise<Snap>; update: (value: Data) => Promise<void>; firestore: { runTransaction: (cb: (tx: Tx) => Promise<void>) => Promise<void> } };
type Snap = { exists: boolean; data: () => Data | undefined };
type Tx = { get: (ref: Ref) => Promise<Snap>; update: (ref: Ref, value: Data) => void };

const harness = vi.hoisted(() => {
  const records = new Map<string, Data>();
  const snap = (path: string): Snap => ({ exists: records.has(path), data: () => records.get(path) });
  const runTransaction = async (callback: (tx: Tx) => Promise<void>) =>
    callback({
      get: async (ref: Ref) => snap(ref.path),
      update: (ref: Ref, value: Data) => records.set(ref.path, { ...records.get(ref.path), ...value }),
    });
  const doc = (path: string): Ref => ({
    path,
    get: async () => snap(path),
    update: async (value: Data) => {
      records.set(path, { ...records.get(path), ...value });
    },
    firestore: { runTransaction },
  });
  const collection = (path: string) => ({
    doc: (id: string) => doc(`${path}/${id}`),
    where: (field: string, _op: string, value: string) => ({
      get: async () => ({
        docs: [...records]
          .filter(([key, data]) => key.startsWith(`${path}/`) && (data as Data)[field] === value)
          .map(([key, data]) => ({ id: key.split('/').at(-1)!, data: () => data })),
      }),
    }),
  });
  return { records, session: vi.fn(), letterRecordsCollection: (tenantId: string) => collection(`criptaLetterRecordsV1/${tenantId}/letters`) };
});

vi.mock('@/modules/cripta/lib/cripta-route', () => ({ criptaRoute: (handler: unknown) => handler }));
vi.mock('@/modules/cripta/lib/active-member', () => ({ activeCriptaSession: harness.session }));
vi.mock('@/modules/cripta/lib/letter-record', async () => {
  const shape = await import('./letter-record-shape');
  return { ...shape, letterRecordsCollection: harness.letterRecordsCollection };
});

import { GET, PATCH } from '../../../app/api/cripta/letter-records/route';

const TENANT = 'tenant-1';

beforeEach(() => {
  harness.records.clear();
  harness.session.mockResolvedValue({ user: { id: 'owner-1' }, authContext: { tenantId: TENANT } });
  harness.records.set(`criptaLetterRecordsV1/${TENANT}/letters/carta-1`, {
    ownerUid: 'owner-1',
    label: 'minha esposa',
    deliveryMode: 'privada',
    status: 'ativa',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    supersedes: null,
    history: [{ at: '2026-01-01T00:00:00.000Z', actorUid: 'owner-1', action: 'criada' }],
  });
  harness.records.set(`criptaLetterRecordsV1/${TENANT}/letters/carta-de-outro`, {
    ownerUid: 'outro-irmao',
    label: 'não deve aparecer',
    deliveryMode: 'privada',
    status: 'ativa',
  });
});

describe('fichas das cartas seladas', () => {
  it('lista só as fichas do próprio Irmão, sem conteúdo cifrado', async () => {
    const response = await GET();
    const body = (await response.json()) as { items: Array<{ id: string; label: string }> };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ id: 'carta-1', label: 'minha esposa' });
  });

  it('retém e depois reativa a entrega, registrando histórico', async () => {
    const patch = (payload: Record<string, unknown>) =>
      PATCH(new Request('https://portal.example/api/cripta/letter-records', { method: 'PATCH', body: JSON.stringify(payload) }));

    expect((await patch({ id: 'carta-1', action: 'retida' })).status).toBe(200);
    expect(harness.records.get(`criptaLetterRecordsV1/${TENANT}/letters/carta-1`)).toMatchObject({ status: 'retida' });

    expect((await patch({ id: 'carta-1', action: 'reativada' })).status).toBe(200);
    const after = harness.records.get(`criptaLetterRecordsV1/${TENANT}/letters/carta-1`);
    expect(after).toMatchObject({ status: 'ativa' });
    expect((after!.history as Array<{ action: string }>).map((entry) => entry.action)).toEqual([
      'criada',
      'retida',
      'reativada',
    ]);
  });

  it('muda o modo de entrega e rejeita um valor desconhecido', async () => {
    const patch = (payload: Record<string, unknown>) =>
      PATCH(new Request('https://portal.example/api/cripta/letter-records', { method: 'PATCH', body: JSON.stringify(payload) }));

    expect((await patch({ id: 'carta-1', action: 'modo_alterado', deliveryMode: 'sessao' })).status).toBe(200);
    expect(harness.records.get(`criptaLetterRecordsV1/${TENANT}/letters/carta-1`)).toMatchObject({ deliveryMode: 'sessao' });

    expect((await patch({ id: 'carta-1', action: 'modo_alterado', deliveryMode: 'inexistente' })).status).toBe(400);
  });

  it('nega agir sobre a ficha de outro Irmão', async () => {
    const response = await PATCH(
      new Request('https://portal.example/api/cripta/letter-records', { method: 'PATCH', body: JSON.stringify({ id: 'carta-de-outro', action: 'retida' }) }),
    );
    expect(response.status).toBe(409);
    expect(harness.records.get(`criptaLetterRecordsV1/${TENANT}/letters/carta-de-outro`)).toMatchObject({ status: 'ativa' });
  });
});
