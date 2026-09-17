/**
 * Classificação de situação do próprio DeMolay dentro do Capítulo — nunca
 * confundida com `ParamasonicEntityMemberSituation` (ativo/inativo, de
 * `ParamasonicEntityMember`): "Sênior" e "Regular", por exemplo, são
 * ambos ativos institucionalmente, mas descrevem faixas etárias/categorias
 * diferentes dentro da própria Ordem DeMolay.
 */
export type DemolayRosterStatus =
  | 'Regular'
  | 'Irregular'
  | 'Sênior'
  | 'Sênior/Consultor'
  | 'Consultor'
  | 'Inativo'
  | 'Falecido';

export interface DemolayRosterRow {
  nomeCompleto: string;
  /** Número de matrícula do DeMolay — preservado para referência futura, ainda sem campo próprio em `ParamasonicEntityMember`. */
  idMatricula: string;
  /** Cargo/função dentro do Capítulo (quase sempre ausente) — não confundir com `status`. */
  cargoOriginal: string | null;
  status: DemolayRosterStatus;
}
