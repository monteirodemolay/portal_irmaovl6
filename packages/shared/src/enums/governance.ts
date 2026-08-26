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

/**
 * Ordem hierárquica maçônica clássica da Diretoria — usada pra ordenar a
 * composição de uma Gestão (tela pública `/acervo/gestoes/[gestaoId]`),
 * nunca a ordem de cadastro (`BoardPositionAssignment.ordem`, que só
 * distingue múltiplas ocorrências do mesmo cargo — Diácono/Experto).
 * Cargo extra digitado pelo usuário (fora de `BOARD_POSITION_KEYS`) vai
 * pro fim, na ordem em que aparece.
 */
export const BOARD_POSITION_HIERARCHY_ORDER: BoardPositionKey[] = [
  'veneravel_mestre',
  'primeiro_vigilante',
  'segundo_vigilante',
  'orador',
  'secretario',
  'tesoureiro',
  'chanceler',
  'hospitaleiro',
  'mestre_cerimonias',
  'mestre_harmonia',
  'diacono',
  'experto',
  'cobridor',
];

export function getBoardPositionHierarchyRank(cargo: string): number {
  const index = BOARD_POSITION_HIERARCHY_ORDER.indexOf(cargo as BoardPositionKey);
  return index === -1 ? BOARD_POSITION_HIERARCHY_ORDER.length : index;
}

/**
 * Rótulo com distinção ordinal (ex.: "1º Diácono", "2º Experto") pros
 * cargos que admitem múltiplas ocorrências na mesma Gestão — `posicao` é a
 * posição do titular dentro do próprio cargo (1-based, já ordenada por
 * `BoardPositionAssignment.ordem`), não a chave bruta de `ordem` em si
 * (evita depender de o Administrador ter digitado 1/2 certinho no
 * cadastro).
 */
export function getBoardPositionOrdinalLabel(cargo: string, posicao: number): string {
  if ((cargo === 'diacono' || cargo === 'experto') && posicao > 0) {
    return `${posicao}º ${getBoardPositionLabel(cargo)}`;
  }
  return getBoardPositionLabel(cargo);
}
