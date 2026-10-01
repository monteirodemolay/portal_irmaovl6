export type WizardStepStatus = 'done' | 'current' | 'pending';
export type WizardStep = { n: number; label: string; status: WizardStepStatus };

/** Which single screen the wizard shows right now. 'aberto' covers both "writing is live" and
 * "closed, about to lacrar" (the Fechamento button lives on that same screen); 'exportar' covers
 * exportação, conferência física and limpeza together, since an operator genuinely bounces
 * between those three while reading units back — splitting them into separate screens would
 * strand the cleanup button a screen away from the check it depends on. Restauração and reabrir
 * are their own screens, deliberately: the user asked for "Reabertura" to read as its own stage,
 * not folded into Lacração. */
export type WizardPhase =
  | 'inauguracao'
  | 'comissao'
  | 'aberto'
  | 'lacrar'
  | 'exportar'
  | 'restaurar'
  | 'reabrir';

export type WizardInput = {
  inaugurated: boolean;
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
  phase: WizardPhase;
  phaseLabel: string;
  /** The exact .lacre filename this phase revolves around, when one exists — the single source
   * of truth for "which file is the current one", so an operator never has to guess whether a
   * file on disk is from this round or a discarded earlier one. */
  currentFile: string | null;
  steps: WizardStep[];
};

const LABELS = [
  'Inauguração',
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
  const steps: WizardStep[] = LABELS.map((label, index) => ({ n: index, label, status: 'pending' as WizardStepStatus }));
  const set = (n: number, status: WizardStepStatus) => { steps[n]!.status = status; };

  if (!input.inaugurated) {
    set(0, 'current');
    return { phase: 'inauguracao', phaseLabel: 'Inauguração — nomear os Guardiões e gerar a chave', currentFile: null, steps };
  }
  set(0, 'done');

  if (input.open) {
    set(1, 'done'); set(2, 'current');
    return {
      phase: 'aberto',
      phaseLabel: input.closesAt
        ? `Recebimento aberto até ${new Date(input.closesAt).toLocaleDateString('pt-BR')}`
        : 'Recebimento aberto',
      currentFile: null,
      steps,
    };
  }
  set(1, input.hasCommission ? 'done' : 'current');
  if (!input.hasCommission) {
    return { phase: 'comissao', phaseLabel: 'Nomeie a Comissão antes de prosseguir', currentFile: null, steps };
  }
  set(2, 'done');

  const sealed = input.receiptStatus === 'sealed';
  if (!sealed) {
    set(3, 'current');
    return { phase: 'lacrar', phaseLabel: 'Recebimento fechado · pronto para lacrar', currentFile: null, steps };
  }
  set(3, 'done'); set(4, 'done');
  const filename = input.receiptCode ? `${input.receiptCode}.lacre` : null;
  const exported = sealed && input.exportReceiptCode === input.receiptCode;

  if (!exported) {
    set(5, 'current');
    return { phase: 'exportar', phaseLabel: `Lacrado (${input.receiptCode}) · aguardando exportação`, currentFile: filename, steps };
  }
  set(5, 'done');

  if (!input.physicalCheckOk) {
    set(6, 'current');
    return { phase: 'exportar', phaseLabel: 'Exportado · aguardando conferência das 3 unidades', currentFile: filename, steps };
  }
  set(6, 'done');

  if (!input.cleanupOk) {
    set(7, 'current');
    return { phase: 'exportar', phaseLabel: 'Conferido · aguardando limpeza do Wix', currentFile: filename, steps };
  }
  set(7, 'done');

  if (!input.restorationOk) {
    set(8, 'current');
    return { phase: 'restaurar', phaseLabel: 'Limpo · aguardando restauração dos rascunhos', currentFile: filename, steps };
  }
  set(8, 'done'); set(2, 'current');
  return { phase: 'reabrir', phaseLabel: 'Restaurado · pronto para reabrir o recebimento', currentFile: filename, steps };
}
