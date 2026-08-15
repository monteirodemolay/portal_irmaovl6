import { BOARD_POSITION_LABELS, type BoardPositionKey } from '@vl6/shared';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';

export interface MemberReportFilters {
  nome?: string;
  grau?: string;
  situacao?: string;
  cidade?: string;
  cim?: string;
  cargo?: string;
}

const FILTER_LABELS: Record<keyof MemberReportFilters, string> = {
  nome: 'Nome',
  cim: 'CIM',
  cidade: 'Cidade',
  grau: 'Grau',
  situacao: 'Situação',
  cargo: 'Cargo',
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Texto tipo "Grau: Mestre Maçom · Situação: Regular" — "Todos os Irmãos"
 * quando nenhum filtro está ativo. Usado tanto na prévia quanto nos 4
 * arquivos baixados, pra bater exatamente o mesmo texto nos dois lugares.
 */
export function describeMemberReportFilters(filters: MemberReportFilters): string {
  const parts: string[] = [];
  if (filters.nome) parts.push(`${FILTER_LABELS.nome}: "${filters.nome}"`);
  if (filters.cim) parts.push(`${FILTER_LABELS.cim}: "${filters.cim}"`);
  if (filters.cidade) parts.push(`${FILTER_LABELS.cidade}: "${filters.cidade}"`);
  if (filters.grau) {
    parts.push(
      `${FILTER_LABELS.grau}: ${MEMBER_DEGREE_LABELS[filters.grau as keyof typeof MEMBER_DEGREE_LABELS] ?? filters.grau}`,
    );
  }
  if (filters.situacao) parts.push(`${FILTER_LABELS.situacao}: ${capitalize(filters.situacao)}`);
  if (filters.cargo) {
    parts.push(
      `${FILTER_LABELS.cargo}: ${BOARD_POSITION_LABELS[filters.cargo as BoardPositionKey] ?? filters.cargo}`,
    );
  }
  return parts.length > 0 ? parts.join(' · ') : 'Todos os Irmãos';
}

/** Querystring de filtros + colunas — a prévia monta uma vez e os 4 links de download só concatenam `&format=X`; a rota de export reaproveita o mesmo parser pra ler de volta. */
export function buildMemberReportExportQuery(
  filters: MemberReportFilters,
  columnKeys: string[],
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  params.set('colunas', columnKeys.join(','));
  return params.toString();
}
