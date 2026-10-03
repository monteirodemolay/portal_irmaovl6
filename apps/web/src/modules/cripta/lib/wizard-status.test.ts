import { beforeEach, describe, expect, it, vi } from 'vitest';

/** currentWizardStatus is the single place the Administração page and the Projetor both read
 * the current cerimônia from — proves it reaches the same phases computeCycleStatus already
 * covers, driven from Firestore-shaped data instead of hand-built WizardInput. */

type Data = Record<string, unknown>;
const harness = vi.hoisted(() => {
  const records = new Map<string, Data>();
  const doc = (path: string) => ({ get: async () => ({ data: () => records.get(path) }) });
  const db = { collection: (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`) }) };
  return { records, db, isOnlineOpen: vi.fn(), openingGet: vi.fn(), readKey: vi.fn() };
});

vi.mock('server-only', () => ({}));
vi.mock('@vl6/infra', () => ({ getAdminFirestore: () => harness.db }));
vi.mock('./online-opening', () => ({
  isOnlineOpen: harness.isOnlineOpen,
  openingRef: () => ({ get: harness.openingGet }),
}));
vi.mock('./cripta-crypto-state', () => ({ readCriptaPublicKey: harness.readKey }));

import { currentWizardStatus } from './wizard-status';

const TENANT = 'tenant-1';

beforeEach(() => {
  harness.records.clear();
  harness.isOnlineOpen.mockResolvedValue(false);
  harness.openingGet.mockResolvedValue({ data: () => undefined });
  harness.readKey.mockResolvedValue(null);
});

describe('currentWizardStatus', () => {
  it('aponta inauguração quando a Cripta nunca foi inaugurada', async () => {
    expect((await currentWizardStatus(TENANT)).phase).toBe('inauguracao');
  });

  it('aponta aberto quando o recebimento está aberto', async () => {
    harness.readKey.mockResolvedValue({ inauguratedAt: '2026-01-01' });
    harness.isOnlineOpen.mockResolvedValue(true);
    expect((await currentWizardStatus(TENANT)).phase).toBe('aberto');
  });

  it('aponta lacrar depois de fechado, sem recibo vigente', async () => {
    harness.readKey.mockResolvedValue({ inauguratedAt: '2026-01-01' });
    harness.records.set(`criptaGovernanceV1/${TENANT}`, { commissionMemberIds: ['m1'] });
    harness.openingGet.mockResolvedValue({ data: () => ({ openedAt: '2026-01-01T00:00:00Z' }) });
    expect((await currentWizardStatus(TENANT)).phase).toBe('lacrar');
  });
});
