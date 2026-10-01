import { describe, expect, it } from 'vitest';
import { computeCycleStatus, type WizardInput } from './cycle-wizard';

const base: WizardInput = {
  inaugurated: false,
  hasCommission: false,
  open: false,
  everOpened: false,
  physicalCheckOk: false,
  cleanupOk: false,
  restorationOk: false,
};

describe('computeCycleStatus', () => {
  it('starts at step 0 (Inauguração) before anything is inaugurated', () => {
    const result = computeCycleStatus(base);
    expect(result.phase).toBe('inauguracao');
    expect(result.steps[0]).toEqual({ n: 0, label: 'Inauguração', status: 'current' });
    expect(result.steps.slice(1).every((step) => step.status === 'pending')).toBe(true);
    expect(result.currentFile).toBeNull();
  });

  it('moves to comissao once inaugurated, before any Comissão is named', () => {
    const result = computeCycleStatus({ ...base, inaugurated: true });
    expect(result.phase).toBe('comissao');
    expect(result.steps[0]!.status).toBe('done');
    expect(result.steps[1]!.status).toBe('current');
  });

  it('moves to "abrir" (step 2) once the Comissão is named but the window has never been opened', () => {
    const result = computeCycleStatus({ ...base, inaugurated: true, hasCommission: true });
    expect(result.phase).toBe('abrir');
    expect(result.steps[1]!.status).toBe('done');
    expect(result.steps[2]!.status).toBe('current');
    expect(result.steps[2]!.label).toBe('Abertura');
  });

  it('moves to step 4 (Fechamento/lacrar) once the window has been opened and then closed', () => {
    const result = computeCycleStatus({
      ...base, inaugurated: true, hasCommission: true, everOpened: true,
    });
    expect(result.phase).toBe('lacrar');
    expect(result.steps[1]!.status).toBe('done');
    expect(result.steps[2]!.status).toBe('done');
    expect(result.steps[3]!.status).toBe('done');
    expect(result.steps[4]!.status).toBe('current');
    expect(result.steps[4]!.label).toBe('Fechamento');
  });

  it('shows "aberto" (step 3, Recebimento aberto) whenever the window is open, regardless of later state', () => {
    const result = computeCycleStatus({ ...base, inaugurated: true, hasCommission: true, open: true, closesAt: '2027-01-01T00:00:00.000Z' });
    expect(result.phase).toBe('aberto');
    expect(result.steps[1]!.status).toBe('done');
    expect(result.steps[2]!.status).toBe('done');
    expect(result.steps[3]!.status).toBe('current');
    expect(result.steps[3]!.label).toBe('Recebimento aberto');
    expect(result.phaseLabel).toContain('aberto até');
  });

  it('reaches "exportar" right after sealing, before export', () => {
    const result = computeCycleStatus({ ...base, inaugurated: true, hasCommission: true, everOpened: true, receiptStatus: 'sealed', receiptCode: 'VL6-X' });
    expect(result.phase).toBe('exportar');
    expect(result.steps[4]!.status).toBe('done');
    expect(result.steps[5]!.status).toBe('done');
    expect(result.steps[6]!.status).toBe('current');
    expect(result.currentFile).toBe('VL6-X.lacre');
  });

  it('never marks export done for a stale export recorded under a different, earlier receipt code', () => {
    const result = computeCycleStatus({
      ...base, inaugurated: true, hasCommission: true, everOpened: true, receiptStatus: 'sealed', receiptCode: 'VL6-NEW', exportReceiptCode: 'VL6-OLD',
    });
    expect(result.steps[6]!.status).toBe('current');
  });

  it('walks through export, conferência, limpeza and restauração in order, all inside the "exportar" phase until restauração', () => {
    const common = { ...base, inaugurated: true, hasCommission: true, everOpened: true, receiptStatus: 'sealed' as const, receiptCode: 'VL6-X', exportReceiptCode: 'VL6-X' };
    const afterExport = computeCycleStatus(common);
    expect(afterExport.phase).toBe('exportar');
    expect(afterExport.steps[7]!.status).toBe('current');

    const afterCheck = computeCycleStatus({ ...common, physicalCheckOk: true });
    expect(afterCheck.phase).toBe('exportar');
    expect(afterCheck.steps[8]!.status).toBe('current');

    const afterCleanup = computeCycleStatus({ ...common, physicalCheckOk: true, cleanupOk: true });
    expect(afterCleanup.phase).toBe('restaurar');
    expect(afterCleanup.steps[9]!.status).toBe('current');

    const done = computeCycleStatus({ ...common, physicalCheckOk: true, cleanupOk: true, restorationOk: true });
    expect(done.phase).toBe('reabrir');
    expect(done.steps[9]!.status).toBe('done');
    expect(done.steps[2]!.status).toBe('current');
    expect(done.phaseLabel).toContain('pronto para reabrir');
  });

  it('every step before the current one is done, and every step after is pending — no gaps', () => {
    const result = computeCycleStatus({
      ...base, inaugurated: true, hasCommission: true, everOpened: true, receiptStatus: 'sealed', receiptCode: 'VL6-X', exportReceiptCode: 'VL6-X', physicalCheckOk: true,
    });
    const currentIndex = result.steps.findIndex((step) => step.status === 'current');
    result.steps.forEach((step, index) => {
      if (index < currentIndex) expect(step.status).toBe('done');
      else if (index > currentIndex) expect(step.status).toBe('pending');
    });
  });
});
