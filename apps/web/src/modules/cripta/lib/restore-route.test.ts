import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { buildLacreFile, encodeEntries, type LacreEntry } from './lacre-format';

/** The restore route used to reupload drafts to Wix one at a time, inside a single request
 * capped at maxDuration=300s — for a Loja with many pending drafts, that chain of round-trips
 * could outrun the limit and kill the function mid-restore, with nothing returned to the
 * operator. This drives the real route against a fake Firestore + a Wix upload stub that
 * tracks how many calls are in flight at once, proving drafts restore concurrently instead of
 * strictly one after another — the fix for the timeout risk — while still ending up correct
 * and in the right order. */

type Data = Record<string, unknown>;
type Ref = {
  path: string;
  get: () => Promise<Snap>;
  create: (value: Data) => Promise<void>;
  update: (value: Data) => Promise<void>;
  collection: (child: string) => Col;
};
type Snap = { exists: boolean; data: () => Data | undefined };
type Col = {
  doc: (id?: string) => Ref;
  get: () => Promise<{ docs: Array<{ id: string; data: () => Data }> }>;
};

const harness = vi.hoisted(() => {
  const records = new Map<string, Data>();
  let autoId = 0;
  const snap = (path: string): Snap => ({ exists: records.has(path), data: () => records.get(path) });
  // Every ref — at any nesting depth (seal doc, drafts/.../users/uid, ...) — carries its own
  // get/create/update/collection, so write methods never get lost when a route chains
  // .collection(...).doc(...).collection(...).doc(...) like restore/route.ts does.
  const doc = (path: string): Ref => ({
    path,
    get: async () => snap(path),
    create: async (value: Data) => {
      records.set(path, value);
    },
    update: async (value: Data) => {
      records.set(path, { ...records.get(path), ...value });
    },
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
  const db = { collection };
  let inFlight = 0;
  let maxInFlight = 0;
  const upload = vi.fn(async (bytes: Buffer) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 15));
    inFlight--;
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    return { fileId: `wix-${upload.mock.calls.length}`, sha256 };
  });
  return {
    records,
    db,
    session: vi.fn(),
    upload,
    concurrency: () => maxInFlight,
    resetConcurrency: () => {
      maxInFlight = 0;
    },
  };
});

vi.mock('@vl6/infra', () => ({ getAdminFirestore: () => harness.db }));
vi.mock('@/modules/cripta/lib/cripta-route', () => ({ criptaRoute: (handler: unknown) => handler }));
vi.mock('@/lib/auth/require-permission', () => ({ requirePagePermission: harness.session }));
vi.mock('@/modules/cripta/lib/wix-private-files', () => ({ uploadPrivateCiphertext: harness.upload }));
vi.mock('@/modules/cripta/lib/lacre-format', async () => import('./lacre-format'));
vi.mock('@/modules/cripta/lib/seal-manifest', async () => import('./seal-manifest'));
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

import { POST } from '../../../app/api/cripta/restore/route';

const TENANT = 'tenant-1';
const CODE = 'VL6-20260928-ABCDEF123456';

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function buildLacreWithDrafts(draftCount: number) {
  const entries: LacreEntry[] = [];
  for (let i = 0; i < draftCount; i++) {
    const bytes = new TextEncoder().encode(`rascunho-${i}`);
    entries.push({ kind: 'draft', id: `uid-${i}`, uid: `uid-${i}`, sha256: await sha256Hex(bytes), bytes });
  }
  const digest = 'b'.repeat(64);
  const payload = encodeEntries(entries);
  const file = buildLacreFile(
    { formato: 'CRIPTA/2', codigoLacracao: CODE, inventoryDigest: digest, totalCartas: 0 },
    payload,
  );
  return { file, digest, entries };
}

function request(file: Uint8Array) {
  const form = new FormData();
  form.set('file', new File([file as BlobPart], 'unidade.lacre'));
  return new Request('https://portal.example/api/cripta/restore', {
    method: 'POST',
    headers: { Origin: 'https://portal.example' },
    body: form,
  });
}

beforeEach(() => {
  harness.records.clear();
  harness.upload.mockClear();
  harness.resetConcurrency();
  harness.session.mockResolvedValue({ user: { id: 'operator-1' }, authContext: { tenantId: TENANT } });
});

describe('restauração de rascunhos após a lacração', () => {
  it('restaura vários rascunhos em paralelo em vez de um por um, e termina com o inventário certo', async () => {
    const draftCount = 20;
    const { file, digest } = await buildLacreWithDrafts(draftCount);
    harness.records.set(`criptaSealsV1/${TENANT}`, {
      status: 'sealed',
      code: CODE,
      inventoryDigest: digest,
      letters: 0,
      cleanup: { receiptCode: CODE, complete: true },
    });

    const response = await POST(request(file));
    const body = (await response.json()) as {
      restoration?: { restoredDrafts: number; skippedDrafts: number; failed: unknown[]; complete: boolean };
      error?: string;
    };

    expect(response.status).toBe(200);
    expect(body.restoration?.restoredDrafts).toBe(draftCount);
    expect(body.restoration?.skippedDrafts).toBe(0);
    expect(body.restoration?.complete).toBe(true);
    expect(harness.upload).toHaveBeenCalledTimes(draftCount);
    // A prova da correção: mais de uma chamada ao Wix esteve em voo ao mesmo tempo — não é
    // mais um loop sequencial de round-trips.
    expect(harness.concurrency()).toBeGreaterThan(1);

    for (let i = 0; i < draftCount; i++) {
      expect(harness.records.get(`criptaOnlineDraftsV1/${TENANT}/users/uid-${i}`)).toMatchObject({
        restoredFrom: CODE,
      });
    }
  });

  it('pula rascunhos já restaurados e continua os demais mesmo com uma falha no meio', async () => {
    const { file, digest } = await buildLacreWithDrafts(5);
    harness.records.set(`criptaSealsV1/${TENANT}`, {
      status: 'sealed',
      code: CODE,
      inventoryDigest: digest,
      letters: 0,
      cleanup: { receiptCode: CODE, complete: true },
    });
    harness.records.set(`criptaOnlineDraftsV1/${TENANT}/users/uid-2`, { fileId: 'already-there' });
    harness.upload.mockImplementationOnce(async () => {
      throw new Error('Wix indisponível');
    });

    const response = await POST(request(file));
    const body = (await response.json()) as {
      restoration?: {
        restoredDrafts: number;
        skippedDrafts: number;
        failed: Array<{ uid: string; error: string }>;
        complete: boolean;
      };
    };

    expect(response.status).toBe(207);
    expect(body.restoration?.skippedDrafts).toBe(1);
    expect(body.restoration?.failed).toHaveLength(1);
    expect(body.restoration?.restoredDrafts).toBe(3);
    expect(body.restoration?.complete).toBe(false);
  });

  it('rejeita um .lacre que não bate com o recibo vigente', async () => {
    const { file } = await buildLacreWithDrafts(1);
    harness.records.set(`criptaSealsV1/${TENANT}`, {
      status: 'sealed',
      code: 'VL6-OUTRO-000000000000',
      inventoryDigest: 'c'.repeat(64),
      letters: 0,
      cleanup: { receiptCode: 'VL6-OUTRO-000000000000', complete: true },
    });

    const response = await POST(request(file));
    expect(response.status).toBe(409);
    expect(harness.upload).not.toHaveBeenCalled();
  });
});
