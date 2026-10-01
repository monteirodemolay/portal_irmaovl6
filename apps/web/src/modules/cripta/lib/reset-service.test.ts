import { beforeEach, describe, expect, it, vi } from 'vitest';

type Data = Record<string, unknown>;
type Ref = { path: string; get: () => Promise<Snap>; listCollections: () => Promise<Collection[]> };
type Snap = { ref: Ref; exists: boolean; data: () => Data | undefined };
type Collection = {
  doc: (id: string) => Ref;
  listDocuments: () => Promise<Ref[]>;
  where: (field: string, op: string, value: unknown) => { get: () => Promise<{ docs: Snap[] }> };
};
type Writer = {
  set: (ref: Ref, value: Data) => void;
  update: (ref: Ref, value: Data) => void;
  delete: (ref: Ref) => void;
};
const harness = vi.hoisted(() => {
  const records = new Map<string, Data>();
  const snap = (path: string): Snap => ({
    ref: doc(path),
    exists: records.has(path),
    data: () => records.get(path),
  });
  const children = (path: string) => [
    ...new Set(
      [...records.keys()]
        .filter((key) => key.startsWith(path + '/'))
        .map((key) => key.split('/')[path.split('/').length]),
    ),
  ];
  const doc = (path: string): Ref => ({
    path,
    get: async () => snap(path),
    listCollections: async () =>
      children(path)
        .filter(Boolean)
        .map((name) => collection(`${path}/${name}`)),
  });
  const collection = (path: string): Collection => ({
    doc: (id) => doc(`${path}/${id}`),
    listDocuments: async () => children(path).map((id) => doc(`${path}/${id}`)),
    where: (field, _op, value) => ({
      get: async () => ({
        docs: [...records]
          .filter(
            ([key, data]) =>
              key.startsWith(path + '/') &&
              key.split('/').length === path.split('/').length + 1 &&
              data[field] === value,
          )
          .map(([key]) => snap(key)),
      }),
    }),
  });
  const writer = () => {
    const writes: Array<() => void> = [];
    return {
      set: (ref: Ref, value: Data) => {
        writes.push(() => {
          records.set(ref.path, value);
        });
      },
      update: (ref: Ref, value: Data) => {
        writes.push(() => {
          if (!records.has(ref.path)) throw new Error('missing');
          records.set(ref.path, { ...records.get(ref.path), ...value });
        });
      },
      delete: (ref: Ref) => {
        writes.push(() => {
          records.delete(ref.path);
        });
      },
      commit: async () => {
        writes.forEach((write) => write());
      },
    };
  };
  let serial: Promise<unknown> = Promise.resolve();
  const db = {
    collection,
    batch: writer,
    runTransaction: (
      callback: (tx: Writer & { get: (ref: Ref) => Promise<Snap> }) => Promise<unknown>,
    ) => {
      const run = serial.then(async () => {
        const writes = writer();
        const value = await callback({ ...writes, get: (ref) => ref.get() });
        await writes.commit();
        return value;
      });
      serial = run.catch(() => undefined);
      return run;
    },
  };
  return { records, db, remove: vi.fn(), session: vi.fn(), permission: vi.fn() };
});
vi.mock('server-only', () => ({}));
vi.mock('@vl6/infra', () => ({ getAdminFirestore: () => harness.db }));
vi.mock('@vl6/domain', () => ({ hasPermission: harness.permission }));
vi.mock('@/lib/auth/get-current-session', () => ({ getCurrentSession: harness.session }));
vi.mock('./early-access', () => ({
  canAccessCriptaPilot: (email: string) => email === 'pilot@example.test',
}));
vi.mock('@/modules/cripta/lib/early-access', () => ({
  canAccessCriptaPilot: (email: string) => email === 'pilot@example.test',
}));
vi.mock('./wix-private-files', () => ({ deleteAndVerifyPrivateCiphertext: harness.remove }));
vi.mock('@/modules/cripta/lib/reset-service', async () => import('./reset-service'));
import { criptaRoute } from './cripta-route';
import { resetInventory } from './reset-inventory';
import { startReset, continueReset, readResetStatus } from './reset-service';
import {
  acquireCriptaOperation,
  CriptaBlocked,
  CriptaStaleCycle,
  OPERATION_LEASE_MS,
} from './reset-control';
import { GET, POST } from '../../../app/api/cripta/reset/route';

function seed() {
  for (const [path, data] of Object.entries({
    'criptaOnlineCapsulesV1/a': { tenantId: 'tenant', uid: 'owner', fileId: 'letter' },
    'criptaOnlineDraftsV1/tenant/users/owner': { fileId: 'draft' },
    'criptaAccountKeysV1/tenant/users/owner': { key: 'secret-test-only' },
    'criptaCryptoV1/tenant': { publicKey: {} },
    'criptaCryptoV1/tenant/events/old': { at: 'old' },
    'criptaGovernanceV1/tenant/events/orphan': { at: 'old' },
    'criptaSealsV1/tenant/physicalChecks/a': { code: 'test' },
    'criptaOnlineOpeningV1/tenant': { open: true },
    'criptaIndividualEventsV2/a': { tenantId: 'tenant' },
    'criptaCleanupPendingV1/a': { tenantId: 'tenant', fileId: 'letter' },
    'criptaPilotV1/owner': { count: 1 },
    'criptaPilotV1/owner/capsules/a': { fileId: 'legacy' },
    'criptaTestCapsulesV1/a': { uid: 'owner', fileId: 'test' },
    'criptaStorageObjectsV1/a': { tenantId: 'tenant', uid: 'owner', fileId: 'orphan-upload' },
  }))
    harness.records.set(path, data);
}
async function finish(id: string) {
  for (let i = 0; i < 20; i++) {
    const status = await continueReset('tenant', 'owner', id);
    if (status.state === 'idle') return status;
  }
  throw new Error('did not finish');
}
const request = (body: unknown, origin = 'https://portal.test') =>
  new Request('https://portal.test/api/cripta/reset', {
    method: 'POST',
    headers: { Origin: origin },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  harness.records.clear();
  harness.remove.mockReset().mockResolvedValue(undefined);
  harness.session.mockResolvedValue({
    user: { id: 'owner', email: 'pilot@example.test' },
    authContext: { tenantId: 'tenant' },
  });
  harness.permission.mockReturnValue(true);
});
describe('zerada real com provedores simulados', () => {
  it('inclui filhos órfãos, arquivos antigos e pendências; preserva outra Loja e cadastros', async () => {
    seed();
    const protectedData = {
      'members/owner': { name: 'unchanged' },
      'criptaOnlineCapsulesV1/other': { tenantId: 'other', fileId: 'other-file' },
      'criptaAccountKeysV1/other/users/owner': { key: 'unchanged' },
      'criptaPilotV1/other-owner/capsules/a': { fileId: 'other-legacy' },
      'criptaTestCapsulesV1/other': { uid: 'owner', tenantId: 'other', fileId: 'other-test' },
    };
    Object.entries(protectedData).forEach(([path, value]) => harness.records.set(path, value));
    expect((await resetInventory('tenant', 'owner')).files).toHaveLength(5);
    const id = await startReset('tenant', 'owner', 0);
    const status = await finish(id);
    expect(status).toMatchObject({
      state: 'idle',
      files: 0,
      records: 0,
      completed: 1,
      generation: 1,
    });
    Object.entries(protectedData).forEach(([path, value]) =>
      expect(harness.records.get(path)).toEqual(value),
    );
    expect(harness.remove.mock.calls.flat()).not.toContain('other-file');
    expect(harness.records.size).toBe(Object.keys(protectedData).length + 1);
  });
  it('aguarda operação em curso e bloqueia novos envios até concluir', async () => {
    seed();
    const operation = await acquireCriptaOperation('tenant');
    const id = await startReset('tenant', 'owner', 0);
    await expect(acquireCriptaOperation('tenant')).rejects.toBeInstanceOf(CriptaBlocked);
    expect((await continueReset('tenant', 'owner', id)).waiting).toBe(true);
    expect(harness.remove).not.toHaveBeenCalled();
    // Represents a just-admitted upload completing after reset was requested.
    harness.records.set('criptaStorageObjectsV1/inflight', {
      tenantId: 'tenant',
      fileId: 'inflight',
    });
    await operation.release();
    await finish(id);
    expect(harness.remove).toHaveBeenCalledWith('inflight');
  });
  it('não apaga referências e chaves quando Wix falha; retoma sem perder pendências', async () => {
    seed();
    harness.remove.mockRejectedValue(new Error('timeout'));
    const id = await startReset('tenant', 'owner', 0);
    expect((await continueReset('tenant', 'owner', id)).failed).toBeGreaterThan(0);
    expect(harness.records.get('criptaOnlineCapsulesV1/a')?.fileId).toBe('letter');
    expect(harness.records.has('criptaAccountKeysV1/tenant/users/owner')).toBe(true);
    expect((await readResetStatus('tenant', 'owner')).state).toBe('resetting');
    harness.remove.mockResolvedValue(undefined);
    expect((await finish(id)).completed).toBe(1);
    expect((await continueReset('tenant', 'owner', id)).completed).toBe(1);
  });
  it('faz dez reinícios independentes e rejeita rascunhos/confirmacões de um ciclo anterior', async () => {
    for (let cycle = 0; cycle < 10; cycle++) {
      seed();
      const id = await startReset('tenant', 'owner', cycle);
      const status = await finish(id);
      expect(status.completed).toBe(cycle + 1);
      await expect(acquireCriptaOperation('tenant', cycle)).rejects.toBeInstanceOf(
        CriptaStaleCycle,
      );
      await expect(startReset('tenant', 'owner', cycle)).rejects.toThrow();
      const operation = await acquireCriptaOperation('tenant', cycle + 1);
      await operation.release();
    }
  });
  it('serializa início e trabalhadores concorrentes', async () => {
    seed();
    const starts = await Promise.allSettled([
      startReset('tenant', 'owner', 0),
      startReset('tenant', 'owner', 0),
    ]);
    expect(starts.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    const id = (
      starts.find((item) => item.status === 'fulfilled') as PromiseFulfilledResult<string>
    ).value;
    const outcomes = await Promise.all([
      continueReset('tenant', 'owner', id),
      continueReset('tenant', 'owner', id),
    ]);
    expect(outcomes.some((item) => item.waiting)).toBe(true);
    await finish(id);
  });
  it('retoma lease de processo encerrado só após margem maior que maxDuration', async () => {
    const operation = await acquireCriptaOperation('tenant');
    const id = await startReset('tenant', 'owner', 0);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + OPERATION_LEASE_MS + 1);
    try {
      expect((await finish(id)).state).toBe('idle');
    } finally {
      clock.mockRestore();
      await operation.release();
    }
  });
});
describe('autorização e confirmação da API', () => {
  it('não altera dados via GET e rejeita origem, texto e geração inválidos', async () => {
    seed();
    const before = JSON.stringify([...harness.records]);
    expect((await GET()).status).toBe(200);
    expect(JSON.stringify([...harness.records])).toBe(before);
    const body = {
      action: 'start',
      confirmation: 'ZERAR CRIPTA',
      generation: 0,
      externalCopiesAcknowledged: true,
    };
    expect((await POST(request(body, 'https://evil.test'))).status).toBe(403);
    expect((await POST(request({ ...body, confirmation: 'zerar' }))).status).toBe(400);
    expect((await POST(request({ ...body, externalCopiesAcknowledged: false }))).status).toBe(400);
    expect((await POST(request({ ...body, generation: -1 }))).status).toBe(400);
    expect((await POST(request({ ...body, tenantId: 'other' }))).status).toBe(202);
    expect(harness.records.has('criptaResetControlV1/other')).toBe(false);
    expect(harness.remove).not.toHaveBeenCalled();
  });
  it('nega sessão ausente, não administrador e conta fora do piloto', async () => {
    harness.permission.mockReturnValue(false);
    expect((await GET()).status).toBe(403);
    harness.permission.mockReturnValue(true);
    harness.session.mockResolvedValue({
      user: { email: 'outsider@example.test' },
      authContext: {},
    });
    expect((await GET()).status).toBe(403);
    harness.session.mockResolvedValue(null);
    expect((await POST(request({}))).status).toBe(403);
    expect(harness.records.size).toBe(0);
  });
});

describe('bloqueio integrado aos handlers', () => {
  it('não executa handler durante zerada ou com rascunho de ciclo anterior', async () => {
    const work = vi.fn(async (_request: Request) => new Response('{}'));
    const route = criptaRoute(work);
    const id = await startReset('tenant', 'owner', 0);
    const draft = (generation: string) =>
      new Request('https://portal.test/api/cripta/draft', {
        method: 'PUT',
        headers: { Origin: 'https://portal.test', 'X-Cripta-Generation': generation },
      });
    expect((await route(draft('0'))).status).toBe(423);
    await finish(id);
    expect((await route(draft('0'))).status).toBe(409);
    expect(work).not.toHaveBeenCalled();
    const response = await route(draft('1'));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cripta-Generation')).toBe('1');
    expect((await readResetStatus('tenant', 'owner')).activeOperations).toBe(0);
  });
  it('libera operação se o handler falha, sem ocultar a falha', async () => {
    const route = criptaRoute(async () => {
      throw new Error('handler failed');
    });
    await expect(route()).rejects.toThrow('handler failed');
    expect((await readResetStatus('tenant', 'owner')).activeOperations).toBe(0);
  });
});
