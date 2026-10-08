import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Drives the real /api/cripta/guardian-shares handlers: reports how many of the 5 shares are
 * still trusted, resolves Guardian names only for display, and lets the Administração mark a
 * share comprometida/revalidada — append-only event, same pattern as every other ceremony act. */

type Data = Record<string, unknown>;
const harness = vi.hoisted(() => {
  const state: { data: Data | undefined } = { data: undefined };
  const events: Data[] = [];
  const members = new Map<string, Data>();
  const ref = {
    get: async () => ({ data: () => state.data }),
    collection: (_name: string) => ({
      doc: () => ({ create: async (value: Data) => { events.push(value); } }),
    }),
    firestore: {
      runTransaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          get: async (r: typeof ref) => r.get(),
          update: (_r: typeof ref, value: Data) => { state.data = { ...state.data, ...value }; },
          create: (doc: { create: (value: Data) => Promise<void> }, value: Data) => doc.create(value),
        }),
    },
  };
  return {
    state,
    events,
    members,
    ref,
    session: vi.fn(),
    findById: vi.fn(async (id: string) => members.get(id)),
    notify: vi.fn(),
  };
});

vi.mock('@/modules/cripta/lib/cripta-route', () => ({ criptaRoute: (handler: unknown) => handler }));
vi.mock('@vl6/infra', () => ({ createServerContainer: () => ({ repositories: { member: { findById: harness.findById } } }) }));
vi.mock('@/modules/notification/lib/notify-all-active-users', () => ({ notifyAllActiveUsers: harness.notify }));
vi.mock('@/lib/auth/require-permission', () => ({ requirePagePermission: harness.session }));
vi.mock('@/modules/cripta/lib/cripta-crypto-state', () => ({
  criptaCryptoRef: () => harness.ref,
  readCriptaPublicKey: async () => (harness.state.data?.publicKey ? harness.state.data : null),
}));
vi.mock('@/modules/cripta/lib/guardian-shares', async () => {
  const shape = await import('./guardian-shares-shape');
  return {
    ...shape,
    criptaCryptoRef: () => harness.ref,
    currentGuardianShares: (data: { guardianShares?: unknown; guardianMemberIds: string[] }) =>
      Array.isArray(data.guardianShares) && data.guardianShares.length === data.guardianMemberIds.length
        ? data.guardianShares
        : data.guardianMemberIds.map((memberId: string) => ({ memberId, status: 'valida' })),
  };
});

import { GET, PATCH } from '../../../app/api/cripta/guardian-shares/route';

const TENANT = 'tenant-1';
const patchRequest = (body: Record<string, unknown>) =>
  new Request('https://portal.example/api/cripta/guardian-shares', {
    method: 'PATCH',
    headers: { Origin: 'https://portal.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  harness.events.length = 0;
  harness.members.clear();
  harness.notify.mockClear();
  harness.session.mockResolvedValue({ user: { id: 'operator-1' }, authContext: { tenantId: TENANT } });
  harness.members.set('g1', { nomeCompleto: 'Fulano Guardião' });
  harness.state.data = {
    publicKey: { x: 'x', y: 'y' },
    totalGuardians: 5,
    threshold: 3,
    guardianMemberIds: ['g1', 'g2', 'g3', 'g4', 'g5'],
    inauguratedAt: '2026-01-01T00:00:00.000Z',
  };
});

describe('GET /api/cripta/guardian-shares', () => {
  it('reporta não inaugurado quando a Cripta ainda não existe', async () => {
    harness.state.data = undefined;
    const body = (await (await GET()).json()) as { inaugurated: boolean };
    expect(body.inaugurated).toBe(false);
  });

  it('conta 5 de 5 válidas e nível ok, com nomes resolvidos', async () => {
    const body = (await (await GET()).json()) as {
      validCount: number;
      alertLevel: string;
      guardians: Array<{ memberId: string; name: string; status: string }>;
    };
    expect(body.validCount).toBe(5);
    expect(body.alertLevel).toBe('ok');
    expect(body.guardians[0]).toMatchObject({ memberId: 'g1', name: 'Fulano Guardião', status: 'valida' });
  });
});

describe('PATCH /api/cripta/guardian-shares', () => {
  it('marca uma parte comprometida, registra evento e recalcula o alerta', async () => {
    const response = await PATCH(patchRequest({ memberId: 'g1', status: 'comprometida', reason: 'pen drive extraviado' }));
    const body = (await response.json()) as { validCount: number; alertLevel: string };
    expect(response.status).toBe(200);
    expect(body.validCount).toBe(4);
    expect(body.alertLevel).toBe('atencao');
    expect(harness.events).toHaveLength(1);
    expect(harness.events[0]).toMatchObject({ type: 'parte.comprometida', memberId: 'g1', reason: 'pen drive extraviado' });
    expect(harness.notify).not.toHaveBeenCalled();
  });

  it('chega a urgente na segunda perda (3 de 5 válidas) e a crítico na terceira, notificando só no crítico', async () => {
    await PATCH(patchRequest({ memberId: 'g1', status: 'comprometida' }));
    const urgente = await PATCH(patchRequest({ memberId: 'g2', status: 'comprometida' }));
    expect((await urgente.json()).alertLevel).toBe('urgente');
    expect(harness.notify).not.toHaveBeenCalled();

    const critico = await PATCH(patchRequest({ memberId: 'g3', status: 'comprometida' }));
    expect((await critico.json()).alertLevel).toBe('critico');
    expect(harness.notify).toHaveBeenCalledTimes(1);
    const [, notifiedTenant, notifyInput] = harness.notify.mock.calls[0]!;
    expect(notifiedTenant).toBe(TENANT);
    expect(notifyInput).toMatchObject({ tipo: 'system', link: '/cripta-administracao' });
  });

  it('revalida uma parte e registra o evento correspondente', async () => {
    await PATCH(patchRequest({ memberId: 'g1', status: 'comprometida' }));
    const response = await PATCH(patchRequest({ memberId: 'g1', status: 'valida' }));
    expect((await response.json()).validCount).toBe(5);
    expect(harness.events.at(-1)).toMatchObject({ type: 'parte.revalidada', memberId: 'g1' });
  });

  it('rejeita um Guardião que não existe nesta Cripta', async () => {
    const response = await PATCH(patchRequest({ memberId: 'intruso', status: 'comprometida' }));
    expect(response.status).toBe(409);
  });

  it('rejeita status desconhecido', async () => {
    const response = await PATCH(patchRequest({ memberId: 'g1', status: 'banido' }));
    expect(response.status).toBe(400);
  });
});
