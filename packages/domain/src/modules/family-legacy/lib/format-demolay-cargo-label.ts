import type { DemolayRosterRow } from './demolay-roster.types';

/**
 * Combina `status` (situação DeMolay) e `cargoOriginal` (cargo dentro do
 * Capítulo, quase sempre ausente) num único texto pro campo `cargo` de
 * `ParamasonicEntityMember` — que só tem um campo livre, sem separar os
 * dois conceitos. Nunca repete a mesma palavra duas vezes (ex.:
 * `cargoOriginal: 'Consultor'` com `status: 'Consultor'`).
 */
export function formatDemolayCargoLabel(row: Pick<DemolayRosterRow, 'status' | 'cargoOriginal'>): string {
  if (!row.cargoOriginal || row.cargoOriginal.toLocaleLowerCase('pt-BR') === row.status.toLocaleLowerCase('pt-BR')) {
    return row.status;
  }
  return `${row.status} — ${row.cargoOriginal}`;
}
