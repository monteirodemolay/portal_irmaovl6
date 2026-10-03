export type WizardStepStatus = 'done' | 'current' | 'pending';
export type WizardStep = { n: number; label: string; status: WizardStepStatus };

/** Which single screen the wizard shows right now. 'abrir' is the Comissão-named-but-never-opened
 * state — a Comissão existing is not the same as the window ever having been opened, so it gets
 * its own "abrir" action, distinct from 'aberto' (writing is live right now). 'exportar' covers
 * exportação, conferência física and limpeza together, since an operator genuinely bounces
 * between those three while reading units back — splitting them into separate screens would
 * strand the cleanup button a screen away from the check it depends on. Restauração and reabrir
 * are their own screens, deliberately: the user asked for "Reabertura" to read as its own stage,
 * not folded into Lacração. */
export type WizardPhase =
  | 'inauguracao'
  | 'comissao'
  | 'abrir'
  | 'aberto'
  | 'lacrar'
  | 'exportar'
  | 'restaurar'
  | 'reabrir';

export type WizardInput = {
  inaugurated: boolean;
  hasCommission: boolean;
  open: boolean;
  /** Whether the receiving window has ever been opened since this Comissão was named — the
   * Firestore opening doc keeps `openedAt` set even after a later closing. Without this, a
   * freshly named Comissão that never opened a window looks identical to one that opened and
   * closed it, and the wizard would skip straight to "lacrar" with no way left to open at all. */
  everOpened: boolean;
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
  'Abertura',
  'Recebimento aberto',
  'Fechamento',
  'Lacração',
  'Exportação',
  'Conferência física',
  'Limpeza do Wix',
  'Restauração',
] as const;

/** Derives where the annual cycle stands purely from already-stored state — no separate event
 * log to keep in sync. "Abertura" (step 2, the act of opening) is its own step, separate from
 * "Recebimento aberto" (step 3, the window actually being live) and from "Fechamento" (step 4,
 * the window having been closed and awaiting lacração) — three different moments that used to be
 * folded together. Each receipt code closes out steps 5-9 once; step 9 (restauração) loops back
 * to step 2 (reabrir), which is why this never reaches a final "done" phase. */
export function computeCycleStatus(input: WizardInput): WizardResult {
  const steps: WizardStep[] = LABELS.map((label, index) => ({ n: index, label, status: 'pending' as WizardStepStatus }));
  const set = (n: number, status: WizardStepStatus) => { steps[n]!.status = status; };

  if (!input.inaugurated) {
    set(0, 'current');
    return { phase: 'inauguracao', phaseLabel: 'Inauguração — nomear os Guardiões e gerar a chave', currentFile: null, steps };
  }
  set(0, 'done');

  if (input.open) {
    set(1, 'done'); set(2, 'done'); set(3, 'current');
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

  if (!input.everOpened) {
    set(2, 'current');
    return { phase: 'abrir', phaseLabel: 'Comissão nomeada · pronto para abrir o recebimento', currentFile: null, steps };
  }
  set(2, 'done');

  const sealed = input.receiptStatus === 'sealed';
  if (!sealed) {
    set(3, 'done'); set(4, 'current');
    return { phase: 'lacrar', phaseLabel: 'Recebimento fechado · pronto para lacrar', currentFile: null, steps };
  }
  set(3, 'done'); set(4, 'done'); set(5, 'done');
  const filename = input.receiptCode ? `${input.receiptCode}.lacre` : null;
  const exported = sealed && input.exportReceiptCode === input.receiptCode;

  if (!exported) {
    set(6, 'current');
    return { phase: 'exportar', phaseLabel: `Lacrado (${input.receiptCode}) · aguardando exportação`, currentFile: filename, steps };
  }
  set(6, 'done');

  if (!input.physicalCheckOk) {
    set(7, 'current');
    return { phase: 'exportar', phaseLabel: 'Exportado · aguardando conferência das 3 unidades', currentFile: filename, steps };
  }
  set(7, 'done');

  if (!input.cleanupOk) {
    set(8, 'current');
    return { phase: 'exportar', phaseLabel: 'Conferido · aguardando limpeza do Wix', currentFile: filename, steps };
  }
  set(8, 'done');

  if (!input.restorationOk) {
    set(9, 'current');
    return { phase: 'restaurar', phaseLabel: 'Limpo · aguardando restauração dos rascunhos', currentFile: filename, steps };
  }
  set(9, 'done'); set(2, 'current');
  return { phase: 'reabrir', phaseLabel: 'Restaurado · pronto para reabrir o recebimento', currentFile: filename, steps };
}

/** The 4 cerimônias the Administração and the Projetor both organize themselves around.
 * Inauguração is its own ato único; abrir/aberto fold into Abertura (the first-ever opening);
 * lacrar/exportar fold into Fechamento; restaurar/reabrir fold into Reabertura (every opening
 * after the first) — see docs/architecture/cripta-reabertura-ficha-e-cerimonia.md §6. */
export type Ceremony = 'inauguracao' | 'abertura' | 'fechamento' | 'reabertura';
export type CeremonyState = 'pending' | 'current' | 'done';

const CEREMONY_BY_PHASE: Record<WizardPhase, Ceremony> = {
  inauguracao: 'inauguracao',
  comissao: 'abertura',
  abrir: 'abertura',
  aberto: 'abertura',
  lacrar: 'fechamento',
  exportar: 'fechamento',
  restaurar: 'reabertura',
  reabrir: 'reabertura',
};

export function ceremonyForPhase(phase: WizardPhase): Ceremony {
  return CEREMONY_BY_PHASE[phase];
}

/** Everything strictly before the active cerimônia in the annual cycle is `done`; everything
 * after is `pending` — Inauguração, being an ato único, is always `done` once passed, never
 * `pending` again. */
export function ceremonyStates(phase: WizardPhase): Record<Ceremony, CeremonyState> {
  const order: Ceremony[] = ['inauguracao', 'abertura', 'fechamento', 'reabertura'];
  const active = ceremonyForPhase(phase);
  const activeIndex = order.indexOf(active);
  const states = {} as Record<Ceremony, CeremonyState>;
  order.forEach((ceremony, index) => {
    states[ceremony] = index === activeIndex ? 'current' : index < activeIndex ? 'done' : 'pending';
  });
  return states;
}
