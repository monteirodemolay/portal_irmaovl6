/**
 * docs/architecture/03-modelo-dados.md — cargos de ocorrência única por
 * gestão (Diácono e Experto são a exceção, admitem múltiplos via `ordem`).
 */
export const BOARD_POSITION_KEYS = [
  'veneravel_mestre',
  'primeiro_vigilante',
  'segundo_vigilante',
  'orador',
  'secretario',
  'tesoureiro',
  'chanceler',
  'hospitaleiro',
  'mestre_harmonia',
  'mestre_cerimonias',
  'diacono',
  'experto',
  'cobridor',
] as const;
export type BoardPositionKey = (typeof BOARD_POSITION_KEYS)[number];

export const SINGLE_OCCURRENCE_BOARD_POSITIONS: BoardPositionKey[] = BOARD_POSITION_KEYS.filter(
  (key) => key !== 'diacono' && key !== 'experto',
);

export const BOARD_POSITION_LABELS: Record<BoardPositionKey, string> = {
  veneravel_mestre: 'Venerável Mestre',
  primeiro_vigilante: '1º Vigilante',
  segundo_vigilante: '2º Vigilante',
  orador: 'Orador',
  secretario: 'Secretário',
  tesoureiro: 'Tesoureiro',
  chanceler: 'Chanceler',
  hospitaleiro: 'Hospitaleiro',
  mestre_harmonia: 'Mestre de Harmonia',
  mestre_cerimonias: 'Mestre de Cerimônias',
  diacono: 'Diácono',
  experto: 'Experto',
  cobridor: 'Cobridor',
};

function isBoardPositionKey(cargo: string): cargo is BoardPositionKey {
  return (BOARD_POSITION_KEYS as readonly string[]).includes(cargo);
}

/** Rótulo de exibição de um cargo — cai para o próprio valor quando é um cargo extra digitado pelo usuário. */
export function getBoardPositionLabel(cargo: string): string {
  return isBoardPositionKey(cargo) ? BOARD_POSITION_LABELS[cargo] : cargo;
}
