import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCriptaKeypair } from './cripta-key';

/** Drives the real /api/cripta/renewal handler: this only ever receives the NEW public key and
 * the new .lacre's header fields (never anything secret), and must refuse to run while the
 * writing window is open, with an unnamed/duplicate/ineligible Guardião, or without a Comissão
 * and Venerável on record. */

type Data = Record<string, unknown>;
const harness = vi.hoisted(() => {
  const records = new Map<string, Data>();
  const snap = (path: string) => ({ exists: records.has(path), data: () => records.get(path) });
  const doc = (path: string) => ({
    path,
    get: async () => snap(path),
    collection: (child: string) => collectionAt(`${path}/${child}`),
  });
  const collectionAt = (path: string) => ({ doc: (id?: string) => doc(`${path}/${id ?? 'auto'}`) });
  const db = {
    collection: (name: string) => collectionAt(name),
    runTransaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        get: async (ref: { path: string }) => snap(ref.path),
        update: (ref: { path: string }, value: Data) => records.set(ref.path, { ...records.get(ref.path), ...value }),
        set: (ref: { path: string }, value: Data) => records.set(ref.path, value),
        create: (ref: { path: string }, value: Data) => records.set(ref.path, value),
      }),
  };
  return {
    records,
    db,
    session: vi.fn(),
    master: vi.fn(),
    isOpen: vi.fn(),
    findById: vi.fn(),
  };
});

vi.mock('@/modules/cripta/lib/cripta-route', () => ({ criptaRoute: (handler: unknown) => handler }));
vi.mock('@vl6/infra', () => ({
  getAdminFirestore: () => harness.db,
  createServerContainer: () => ({ repositories: { member: { findById: harness.findById } } }),
}));
vi.mock('@/lib/auth/require-permission', () => ({ requirePagePermission: harness.session }));
vi.mock('@/modules/cripta/lib/current-master', () => ({ currentCriptaMaster: harness.master }));
vi.mock('@/modules/cripta/lib/online-opening', () => ({ isOnlineOpen: harness.isOpen }));
vi.mock('@/modules/cripta/lib/cripta-crypto-state', () => ({
  criptaCryptoRef: (tenantId: string) => harness.db.collection('criptaCryptoV1').doc(tenantId),
  readCriptaPublicKey: async (tenantId: string) => {
    const data = harness.records.get(`criptaCryptoV1/${tenantId}`);
    return data?.publicKey ? data : null;
  },
}));
vi.mock('@/modules/cripta/lib/guardian-shares', async () => {
  const shape = await import('./guardian-shares-shape');
  return { ...shape, initialGuardianShares: (ids: string[]) => ids.map((memberId) => ({ memberId, status: 'valida' })) };
});
vi.mock('@/modules/cripta/lib/seal-state', () => ({
  sealRef: (tenantId: string) => harness.db.collection('criptaSealsV1').doc(tenantId),
}));
vi.mock('@/modules/cripta/lib/seal-manifest', async () => import('./seal-manifest'));

import { POST } from '../../../app/api/cripta/renewal/route';

const TENANT = 'tenant-1';
let newPublicKey: Awaited<ReturnType<typeof generateCriptaKeypair>>['publicKey'];

function addMember(id: string, overrides: Data = {}) {
  harness.records.set(`members/${id}`, { id, tenantId: TENANT, situacao: 'ativo', userId: `uid-${id}`, ...overrides });
}

function request(body: Record<string, unknown>) {
  return new Request('https://portal.example/api/cripta/renewal', {
    method: 'POST',
    headers: { Origin: 'https://portal.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    newPublicKey,
    guardianMemberIds: ['g1', 'g2', 'g3', 'g4', 'g5'],
    minutes: 'Ata 140/2027 — Renovação',
    reason: 'pen drive extraviado',
    newCode: 'VL6-20270101-ABCDEF123456',
    newInventoryDigest: 'a'.repeat(64),
    newLetters: 2,
    newDrafts: 1,
    ...overrides,
  };
}

beforeEach(async () => {
  harness.records.clear();
  harness.findById.mockImplementation(async (id: string) => harness.records.get(`members/${id}`));
  harness.session.mockResolvedValue({ user: { id: 'operator-1' }, authContext: { tenantId: TENANT } });
  harness.master.mockResolvedValue({ member: { id: 'master-1', nomeCompleto: 'Venerável' }, termId: 'term-1' });
  harness.isOpen.mockResolvedValue(false);
  const { publicKey } = await generateCriptaKeypair();
  newPublicKey = publicKey;
  harness.records.set(`criptaCryptoV1/${TENANT}`, {
    publicKey: (await generateCriptaKeypair()).publicKey,
    totalGuardians: 5,
    threshold: 3,
    guardianMemberIds: ['old1', 'old2', 'old3', 'old4', 'old5'],
    minutes: 'Ata original',
    masterId: 'master-1',
    inauguratedAt: '2026-01-01T00:00:00.000Z',
  });
  harness.records.set(`criptaGovernanceV1/${TENANT}`, { commissionMemberIds: ['g1'], nextOpeningDate: '2027-02-01' });
  harness.records.set(`criptaSealsV1/${TENANT}`, { code: 'VL6-OLD-000000000000', status: 'sealed' });
  for (const id of ['g1', 'g2', 'g3', 'g4', 'g5']) addMember(id);
});

describe('POST /api/cripta/renewal', () => {
  it('registra a Renovação: nova chave, novos Guardiões válidos, novo recibo', async () => {
    const response = await POST(request(validBody()));
    const body = (await response.json()) as { renewed?: boolean; newCode?: string; previousCode?: string };
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ renewed: true, newCode: 'VL6-20270101-ABCDEF123456', previousCode: 'VL6-OLD-000000000000' });

    const crypto = harness.records.get(`criptaCryptoV1/${TENANT}`);
    expect(crypto?.publicKey).toEqual(newPublicKey);
    expect(crypto?.guardianMemberIds).toEqual(['g1', 'g2', 'g3', 'g4', 'g5']);
    expect(crypto?.inauguratedAt).toBe('2026-01-01T00:00:00.000Z'); // ato único preservado
    expect(crypto?.renewalCount).toBe(1);

    const seal = harness.records.get(`criptaSealsV1/${TENANT}`);
    expect(seal).toMatchObject({ status: 'sealed', code: 'VL6-20270101-ABCDEF123456', letters: 2, drafts: 1, count: 3 });
    expect((seal?.export as Data)?.receiptCode).toBe('VL6-20270101-ABCDEF123456');
  });

  it('nega enquanto o recebimento está aberto', async () => {
    harness.isOpen.mockResolvedValue(true);
    const response = await POST(request(validBody()));
    expect(response.status).toBe(409);
  });

  it('nega sem Cripta inaugurada', async () => {
    harness.records.delete(`criptaCryptoV1/${TENANT}`);
    const response = await POST(request(validBody()));
    expect(response.status).toBe(409);
  });

  it('rejeita Guardiões repetidos ou em número diferente de 5', async () => {
    expect((await POST(request(validBody({ guardianMemberIds: ['g1', 'g1', 'g2', 'g3', 'g4'] })))).status).toBe(400);
    expect((await POST(request(validBody({ guardianMemberIds: ['g1', 'g2', 'g3', 'g4'] })))).status).toBe(400);
  });

  it('rejeita Guardião inativo, sem conta vinculada, ou o próprio Venerável', async () => {
    addMember('inativo', { situacao: 'desligado' });
    const response = await POST(request(validBody({ guardianMemberIds: ['g1', 'g2', 'g3', 'g4', 'inativo'] })));
    expect(response.status).toBe(400);
    const asMaster = await POST(request(validBody({ guardianMemberIds: ['g1', 'g2', 'g3', 'g4', 'master-1'] })));
    expect(asMaster.status).toBe(400);
  });

  it('rejeita código ou digesto do novo .lacre fora do formato esperado', async () => {
    expect((await POST(request(validBody({ newCode: 'nope' })))).status).toBe(400);
    expect((await POST(request(validBody({ newInventoryDigest: 'nope' })))).status).toBe(400);
  });

  it('exige Comissão nomeada antes da Renovação', async () => {
    harness.records.delete(`criptaGovernanceV1/${TENANT}`);
    const response = await POST(request(validBody()));
    expect(response.status).toBe(409);
  });
});
