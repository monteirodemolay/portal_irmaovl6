import { describe, expect, it } from 'vitest';
import { computeCycleStatus, type WizardInput } from './cycle-wizard';

const base: WizardInput = {
  hasCommission: false,
  open: false,
  physicalCheckOk: false,
  cleanupOk: false,
  restorationOk: false,
};

describe('computeCycleStatus', () => {
  it('starts at step 1 when there is no Comissão yet', () => {
    const result = computeCycleStatus(base);
    expect(result.steps[0]).toEqual({ n: 1, label: 'Comissão e data', status: 'current' });
    expect(result.steps.slice(1).every((step) => step.status === 'pending')).toBe(true);
    expect(result.currentFile).toBeNull();
  });

  it('moves to step 3 once the Comissão is named and the window is closed', () => {
    const result = computeCycleStatus({ ...base, hasCommission: true });
    expect(result.steps[0]!.status).toBe('done');
    expect(result.steps[1]!.status).toBe('done');
    expect(result.steps[2]!.status).toBe('current');
  });

  it('shows step 2 as current whenever the window is open, regardless of later state', () => {
    const result = computeCycleStatus({ ...base, hasCommission: true, open: true, closesAt: '2027-01-01T00:00:00.000Z' });
    expect(result.steps[0]!.status).toBe('done');
    expect(result.steps[1]!.status).toBe('current');
    expect(result.phase).toContain('aberto até');
  });

  it('reaches step 4 done and step 5 current right after sealing, before export', () => {
    const result = computeCycleStatus({ ...base, hasCommission: true, receiptStatus: 'sealed', receiptCode: 'VL6-X' });
    expect(result.steps[3]!.status).toBe('done');
    expect(result.steps[4]!.status).toBe('current');
    expect(result.currentFile).toBe('VL6-X.lacre');
  });

  it('never marks export done for a stale export recorded under a different, earlier receipt code', () => {
    const result = computeCycleStatus({
      ...base, hasCommission: true, receiptStatus: 'sealed', receiptCode: 'VL6-NEW', exportReceiptCode: 'VL6-OLD',
    });
    expect(result.steps[4]!.status).toBe('current');
  });

  it('walks through export, conferência, limpeza and restauração in order', () => {
    const common = { ...base, hasCommission: true, receiptStatus: 'sealed' as const, receiptCode: 'VL6-X', exportReceiptCode: 'VL6-X' };
    expect(computeCycleStatus(common).steps[5]!.status).toBe('current');
    expect(computeCycleStatus({ ...common, physicalCheckOk: true }).steps[6]!.status).toBe('current');
    expect(computeCycleStatus({ ...common, physicalCheckOk: true, cleanupOk: true }).steps[7]!.status).toBe('current');
    const done = computeCycleStatus({ ...common, physicalCheckOk: true, cleanupOk: true, restorationOk: true });
    expect(done.steps[7]!.status).toBe('done');
    expect(done.phase).toContain('pronto para reabrir');
  });

  it('every step from 1 to the current one is done, and every step after is pending — no gaps', () => {
    const result = computeCycleStatus({
      ...base, hasCommission: true, receiptStatus: 'sealed', receiptCode: 'VL6-X', exportReceiptCode: 'VL6-X', physicalCheckOk: true,
    });
    const currentIndex = result.steps.findIndex((step) => step.status === 'current');
    result.steps.forEach((step, index) => {
      if (index < currentIndex) expect(step.status).toBe('done');
      else if (index > currentIndex) expect(step.status).toBe('pending');
    });
  });
});
