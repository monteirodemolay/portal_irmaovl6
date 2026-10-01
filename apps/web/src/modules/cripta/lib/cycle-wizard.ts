export type WizardStepStatus = 'done' | 'current' | 'pending';
export type WizardStep = { n: number; label: string; status: WizardStepStatus };

export type WizardInput = {
  hasCommission: boolean;
  open: boolean;
  closesAt?: string | null;
  receiptStatus?: string | null;
  receiptCode?: string | null;
  exportReceiptCode?: string | null;
  physicalCheckOk: boolean;
  cleanupOk: boolean;
  restorationOk: boolean;
};

export type WizardResult = {
  phase: string;
  /** The exact .lacre filename this phase revolves around, when one exists — the single source
   * of truth for "which file is the current one", so an operator never has to guess whether a
   * file on disk is from this round or a discarded earlier one. */
  currentFile: string | null;
  steps: WizardStep[];
};

const LABELS = [
  'Comissão e data',
  'Recebimento aberto',
  'Fechamento',
  'Lacração',
  'Exportação',
  'Conferência física',
  'Limpeza do Wix',
  'Restauração',
] as const;

/** Derives where the annual cycle stands purely from already-stored state — no separate event
 * log to keep in sync. Each receipt code closes out steps 4-8 once; step 8 (restauração) loops
 * back to step 2 (reabrir), which is why this never reaches a final "done" phase. */
export function computeCycleStatus(input: WizardInput): WizardResult {
  const sealed = input.receiptStatus === 'sealed';
  const exported = sealed && input.exportReceiptCode === input.receiptCode;
  const steps: WizardStep[] = LABELS.map((label, index) => ({ n: index + 1, label, status: 'pending' as WizardStepStatus }));
  const set = (n: number, status: WizardStepStatus) => { steps[n - 1]!.status = status; };

  if (input.open) {
    set(1, 'done'); set(2, 'current');
    return {
      phase: input.closesAt
        ? `Recebimento aberto até ${new Date(input.closesAt).toLocaleDateString('pt-BR')}`
        : 'Recebimento aberto',
      currentFile: null,
      steps,
    };
  }
  set(1, input.hasCommission ? 'done' : 'current');
  if (!input.hasCommission) return { phase: 'Nomeie a Comissão antes de prosseguir', currentFile: null, steps };
  set(2, 'done');

  if (!sealed) {
    set(3, 'current');
    return { phase: 'Recebimento fechado · aguardando lacração', currentFile: null, steps };
  }
  set(3, 'done'); set(4, 'done');
  const filename = input.receiptCode ? `${input.receiptCode}.lacre` : null;

  if (!exported) {
    set(5, 'current');
    return { phase: `Lacrado (${input.receiptCode}) · aguardando exportação`, currentFile: filename, steps };
  }
  set(5, 'done');

  if (!input.physicalCheckOk) {
    set(6, 'current');
    return { phase: 'Exportado · aguardando conferência das 3 unidades', currentFile: filename, steps };
  }
  set(6, 'done');

  if (!input.cleanupOk) {
    set(7, 'current');
    return { phase: 'Conferido · aguardando limpeza do Wix', currentFile: filename, steps };
  }
  set(7, 'done');

  if (!input.restorationOk) {
    set(8, 'current');
    return { phase: 'Limpo · aguardando restauração dos rascunhos', currentFile: filename, steps };
  }
  set(8, 'done');
  return { phase: 'Restaurado · pronto para reabrir o recebimento', currentFile: filename, steps };
}
