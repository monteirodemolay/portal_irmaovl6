import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCriptaKeypair, sealForCripta, type CriptaPublicKey } from './cripta-key';

type Doc = { path: string; get: () => Promise<Snapshot>; create: (value: Record<string, unknown>) => Promise<unknown>; collection: (child: string) => Collection };
type Query = { query: string; uid: string };
type Snapshot = { exists: boolean; data: () => Record<string, unknown> | undefined };
type Collection = { doc: (id: string) => Doc; where: (field: string, op: string, uid: string) => Query };
type Tx = { get: (ref: Doc | Query) => Promise<unknown>; create: (ref: Doc, value: Record<string, unknown>) => unknown; set: (ref: Doc, value: Record<string, unknown>) => unknown };
const harness = vi.hoisted(() => {
  const records = new Map<string, Record<string, unknown>>();
  const snapshot = (path: string) => ({ exists: records.has(path), data: () => records.get(path) });
  const collection = (path: string): Collection => ({
    doc: (id: string): Doc => ({ path: `${path}/${id}`, get: async () => snapshot(`${path}/${id}`),
      create: async (value: Record<string, unknown>) => records.set(`${path}/${id}`, value),
      collection: (child: string) => collection(`${path}/${id}/${child}`) }),
    where: (_field: string, _op: string, uid: string) => ({ query: path, uid }),
  });
  let serial: Promise<unknown> = Promise.resolve();
  const db = { collection, runTransaction: (callback: (tx: Tx) => Promise<unknown>) => {
    const run = serial.then(() => callback({
      get: async (ref: Doc | Query) => 'query' in ref ? { docs: [...records].filter(([key, value]) => key.startsWith(`${ref.query}/`) && value.uid === ref.uid)
        .map(([key, value]) => ({ id: key.split('/').at(-1), data: () => value })) } : snapshot(ref.path),
      create: (ref: Doc, value: Record<string, unknown>) => records.set(ref.path, value),
      set: (ref: Doc, value: Record<string, unknown>) => records.set(ref.path, value),
    }));
    serial = run.catch(() => undefined); return run;
  } };
  return { records, db, session: vi.fn(), upload: vi.fn(), download: vi.fn(), remove: vi.fn() };
});
vi.mock('@vl6/infra', () => ({ getAdminFirestore: () => harness.db }));
vi.mock('@/modules/cripta/lib/active-member', () => ({ activeCriptaSession: harness.session }));
vi.mock('@/modules/cripta/lib/wix-private-files', () => ({ uploadPrivateCiphertext: harness.upload, downloadPrivateCiphertext: harness.download, deletePrivateCiphertext: harness.remove }));
vi.mock('@/modules/cripta/lib/online-opening', () => ({ openingRef: () => harness.db.collection('opening').doc('tenant'), isOnlineOpen: async () => {
  const data = harness.records.get('opening/tenant');
  return data?.open === true && Date.parse(data.closesAt as string) > Date.now();
} }));
vi.mock('@/modules/cripta/lib/cripta-crypto-state', () => ({ criptaCryptoRef: () => harness.db.collection('crypto').doc('tenant') }));
vi.mock('@/modules/cripta/lib/receiving-window', async () => import('./receiving-window'));
vi.mock('@/modules/cripta/lib/sealed-request', async () => import('./sealed-request'));
import { POST } from '../../../app/api/cripta/online-capsules/route';

let publicKey: CriptaPublicKey;
let wire: string;
const request = (origin = 'https://portal.example', body = wire, key = `${publicKey.x}.${publicKey.y}`) => new Request('https://portal.example/api/cripta/online-capsules', {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Cripta-Key': key }, body,
});
beforeEach(async () => {
  harness.records.clear();
  harness.session.mockResolvedValue({ user: { id: 'owner' }, authContext: { tenantId: 'tenant' } });
  harness.upload.mockReset(); harness.download.mockReset(); harness.remove.mockReset();
  let uploads = 0;
  harness.upload.mockImplementation(async () => ({ fileId: `upload-${++uploads}`, sha256: 'a'.repeat(64) }));
  harness.download.mockResolvedValue(new Uint8Array()); harness.remove.mockResolvedValue(undefined);
  ({ publicKey } = await generateCriptaKeypair());
  wire = JSON.stringify(await sealForCripta(new TextEncoder().encode('Ensaio fictício'), publicKey));
  harness.records.set('crypto/tenant', { publicKey });
  harness.records.set('opening/tenant', { open: true, openedAt: new Date(Date.now() - 1000).toISOString(), closesAt: new Date(Date.now() + 60000).toISOString() });
});
describe('API de depósito com serviços simulados', () => {
  it('nega sessão ausente e origem externa antes de enviar bytes', async () => {
    expect((await POST(request('https://other.example'))).status).toBe(403);
    harness.session.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(403);
    expect(harness.upload).not.toHaveBeenCalled();
  });
  it('nega janela fechada e envelope inválido', async () => {
    expect((await POST(request(undefined, '{}'))).status).toBe(400);
    harness.records.delete('opening/tenant');
    expect((await POST(request())).status).toBe(403);
    expect(harness.upload).not.toHaveBeenCalled();
  });
  it('devolve o mesmo recibo em duas tentativas concorrentes e elimina upload excedente', async () => {
    const responses = await Promise.all([POST(request()), POST(request())]);
    const receipts = await Promise.all(responses.map((response) => response.json()));
    expect(receipts[0].id).toBe(receipts[1].id);
    expect([...harness.records.keys()].filter((key) => key.startsWith('criptaOnlineCapsulesV1/'))).toHaveLength(1);
    expect(harness.remove).toHaveBeenCalledTimes(1);
    harness.records.delete('opening/tenant');
    expect((await POST(request())).status).toBe(200);
  });
  it('reconfere prazo e chave depois do upload, sem confirmar carta irrecuperável', async () => {
    expect((await POST(request(undefined, wire, 'outra-chave'))).status).toBe(409);
    harness.download.mockImplementation(async () => { harness.records.delete('opening/tenant'); });
    expect((await POST(request())).status).toBe(409);
    expect([...harness.records.keys()].filter((key) => key.startsWith('criptaOnlineCapsulesV1/'))).toHaveLength(0);
  });
  it('impõe a cota dentro da transação', async () => {
    for (let i = 0; i < 5; i++) harness.records.set(`criptaOnlineCapsulesV1/${i}`, { uid: 'owner', tenantId: 'tenant', status: 'ready' });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('cinco');
    expect(harness.remove).toHaveBeenCalledTimes(1);
  });
});
