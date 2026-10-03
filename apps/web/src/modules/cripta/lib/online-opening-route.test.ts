import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCriptaKeypair } from './cripta-key';
import { computeCycleStatus } from './cycle-wizard';
import { isReceivingWindowOpen } from './receiving-window';

/** End-to-end check of the bug the Venerável reported: a freshly named Comissão that never
 * opened a window used to fall straight into the "Fechamento" screen, with no button anywhere
 * to open it. This test drives the real `/api/cripta/online-opening` POST handler (not a
 * reimplementation) against a fake Firestore, the same way `deposit-route.test.ts` does, and
 * checks the real `computeCycleStatus` and `isReceivingWindowOpen` — the two functions the admin
 * wizard and the member page actually read — before and after. */

type Data = Record<string, unknown>;
type Ref = { path: string; get: () => Promise<Snap>; collection: (child: string) => Col };
type Snap = { exists: boolean; data: () => Data | undefined };
type Col = { doc: (id?: string) => Ref; get: () => Promise<{ docs: Array<{ id: string; data: () => Data }> }> };

const harness = vi.hoisted(() => {
  const records = new Map<string, Data>();
  let autoId = 0;
  const snap = (path: string): Snap => ({ exists: records.has(path), data: () => records.get(path) });
  const doc = (path: string): Ref => ({
    path,
    get: async () => snap(path),
    collection: (child: string) => collection(`${path}/${child}`),
  });
  const collection = (path: string): Col => ({
    doc: (id?: string) => doc(`${path}/${id ?? `auto-${++autoId}`}`),
    get: async () => ({
      docs: [...records]
        .filter(([key]) => key.startsWith(`${path}/`) && key.slice(path.length + 1).split('/').length === 1)
        .map(([key, value]) => ({ id: key.split('/').at(-1)!, data: () => value })),
    }),
  });
  type Tx = { get: (ref: Ref) => Promise<Snap>; create: (ref: Ref, value: Data) => void; update: (ref: Ref, value: Data) => void; set: (ref: Ref, value: Data) => void };
  const db = {
    collection,
    runTransaction: async (callback: (tx: Tx) => Promise<unknown>) =>
      callback({
        get: async (ref: Ref) => ref.get(),
        create: (ref: Ref, value: Data) => records.set(ref.path, value),
        update: (ref: Ref, value: Data) => records.set(ref.path, { ...records.get(ref.path), ...value }),
        set: (ref: Ref, value: Data) => records.set(ref.path, value),
      }),
  };
  return { records, db, session: vi.fn(), findMember: vi.fn() };
});

vi.mock('@vl6/infra', () => ({
  getAdminFirestore: () => harness.db,
  createServerContainer: () => ({ repositories: { member: { findById: harness.findMember } } }),
}));
vi.mock('@/modules/cripta/lib/cripta-route', () => ({ criptaRoute: (handler: unknown) => handler }));
vi.mock('@/lib/auth/require-permission', () => ({ requirePagePermission: harness.session }));
vi.mock('@/lib/auth/get-current-session', () => ({ getCurrentSession: harness.session }));
vi.mock('@/modules/cripta/lib/current-master', () => ({
  currentCriptaMaster: async () => ({ member: { id: 'master-1', nomeCompleto: 'Venerável Teste' }, termId: 'term-1' }),
}));
// Bare "@/..." specifiers don't resolve under this vitest config (no alias/tsconfig-paths
// plugin — see vitest.config.ts). Every "@/modules/cripta/lib/*" the route imports has to be
// satisfied somehow. Where the real file has no `import 'server-only'` guard, re-export it
// unmodified via a relative import so the route exercises genuine logic, same as
// deposit-route.test.ts. Where it does (cripta-crypto-state, online-opening, seal-state), stub
// just the thin Firestore wrapper against `harness.db`, reusing the real pure helpers
// (digestInventory) underneath — the same trade-off deposit-route.test.ts already makes.
vi.mock('@/modules/cripta/lib/receiving-window', async () => import('./receiving-window'));
vi.mock('@/modules/cripta/lib/seal-manifest', async () => import('./seal-manifest'));
vi.mock('@/modules/cripta/lib/reopen-check', async () => import('./reopen-check'));
vi.mock('@/modules/cripta/lib/cripta-crypto-state', () => ({
  criptaCryptoRef: (tenantId: string) => harness.db.collection('criptaCryptoV1').doc(tenantId),
}));
vi.mock('@/modules/cripta/lib/online-opening', () => ({
  openingRef: (tenantId: string) => harness.db.collection('criptaOnlineOpeningV1').doc(tenantId),
}));
vi.mock('@/modules/cripta/lib/seal-state', async () => {
  const { digestInventory } = await import('./seal-manifest');
  return {
    sealRef: (tenantId: string) => harness.db.collection('criptaSealsV1').doc(tenantId),
    currentInventory: async (tenantId: string) => {
      const [letters, drafts] = await Promise.all([
        harness.db.collection('criptaOnlineCapsulesV1').get(),
        harness.db.collection('criptaOnlineDraftsV1').doc(tenantId).collection('users').get(),
      ]);
      const entries: Array<{ kind: 'letter' | 'draft'; id: string; uid: string; sha256: string; fileId: string }> = [];
      for (const item of letters.docs) {
        const data = item.data() as Data;
        if (data.tenantId !== tenantId || data.status !== 'ready') continue;
        entries.push({ kind: 'letter', id: item.id, uid: data.uid as string, sha256: data.sha256 as string, fileId: data.fileId as string });
      }
      for (const item of drafts.docs) {
        const data = item.data() as Data;
        if (data.status === 'deleted') continue;
        entries.push({ kind: 'draft', id: item.id, uid: item.id, sha256: data.sha256 as string, fileId: data.fileId as string });
      }
      return digestInventory(entries);
    },
  };
});

import { POST } from '../../../app/api/cripta/online-opening/route';

const TENANT = 'tenant-1';
const request = (body: Record<string, unknown>, origin = 'https://portal.example') =>
  new Request('https://portal.example/api/cripta/online-opening', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(async () => {
  harness.records.clear();
  harness.session.mockResolvedValue({ user: { id: 'operator-1', email: 'operador@vl6.example' }, authContext: { tenantId: TENANT } });
  harness.findMember.mockResolvedValue({ id: 'member-2', tenantId: TENANT, situacao: 'ativo', userId: 'uid-2', nomeCompleto: 'Irmão Presente' });
  const { publicKey } = await generateCriptaKeypair();
  harness.records.set(`criptaCryptoV1/${TENANT}`, { publicKey, inauguratedAt: new Date().toISOString() });
  harness.records.set(`criptaGovernanceV1/${TENANT}`, { commissionMemberIds: ['member-2'], nextOpeningDate: '2027-01-01' });
});

describe('Comissão nomeada que nunca abriu a escrita', () => {
  it('o wizard aponta para a fase "abrir", não para "lacrar"', () => {
    const wizard = computeCycleStatus({
      inaugurated: true,
      hasCommission: true,
      open: false,
      everOpened: false,
      physicalCheckOk: false,
      cleanupOk: false,
      restorationOk: false,
    });
    expect(wizard.phase).toBe('abrir');
  });

  it('a janela do irmão começa fechada', () => {
    expect(isReceivingWindowOpen(harness.records.get(`criptaOnlineOpeningV1/${TENANT}`))).toBe(false);
  });

  it('abrir pela primeira vez funciona sem exigir um lacre anterior, e depois o wizard e a tela do irmão refletem a abertura', async () => {
    const response = await POST(
      request({ open: true, minutes: 'Ata 001/2027', presentMemberId: 'member-2', durationDays: 10 }),
    );
    const body = (await response.json()) as { open?: boolean; error?: string };
    expect(response.status).toBe(200);
    expect(body.open).toBe(true);

    const openingData = harness.records.get(`criptaOnlineOpeningV1/${TENANT}`);
    expect(isReceivingWindowOpen(openingData)).toBe(true);

    const wizardAfterOpening = computeCycleStatus({
      inaugurated: true,
      hasCommission: true,
      open: true,
      everOpened: true,
      closesAt: openingData?.closesAt as string,
      physicalCheckOk: false,
      cleanupOk: false,
      restorationOk: false,
    });
    expect(wizardAfterOpening.phase).toBe('aberto');
  });

  it('registra a lista de presença completa (opcional) sem exigi-la para abrir', async () => {
    const response = await POST(
      request({
        open: true,
        minutes: 'Ata 001/2027',
        presentMemberId: 'member-2',
        durationDays: 10,
        presentMemberIds: ['member-2', 'member-2', ''],
        presentOthers: ['Convidado Externo', '  ', 'Convidado Externo'],
      }),
    );
    expect(response.status).toBe(200);
    const eventKey = [...harness.records.keys()].find((key) =>
      key.startsWith(`criptaOnlineOpeningV1/${TENANT}/events/`),
    )!;
    const event = harness.records.get(eventKey);
    expect(event?.presentMemberIds).toEqual(['member-2']);
    expect(event?.presentOthers).toEqual(['Convidado Externo']);
  });

  it('abre normalmente sem nenhuma lista de presença adicional (campo opcional ausente)', async () => {
    const response = await POST(
      request({ open: true, minutes: 'Ata 001/2027', presentMemberId: 'member-2', durationDays: 10 }),
    );
    expect(response.status).toBe(200);
  });

  it('rejeita abrir sem Comissão nomeada', async () => {
    harness.records.delete(`criptaGovernanceV1/${TENANT}`);
    const response = await POST(
      request({ open: true, minutes: 'Ata 001/2027', presentMemberId: 'member-2', durationDays: 10 }),
    );
    expect(response.status).toBe(409);
    expect(isReceivingWindowOpen(harness.records.get(`criptaOnlineOpeningV1/${TENANT}`))).toBe(false);
  });
});
