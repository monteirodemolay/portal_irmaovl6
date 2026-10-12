import { normalizeForSearch, type HonorTypeKey } from '@vl6/shared';

/** Linha serializável da lista administrativa de honrarias. */
export interface HonorRow {
  id: string;
  nomeOficial: string;
  tipo: HonorTypeKey;
  homenageado: string;
  /** Preenchido só quando o homenageado é um Irmão cadastrado. */
  memberId: string | null;
  instituicao: string;
  /** ISO ou null. */
  data: string | null;
  numeroAto: string | null;
  temDiploma: boolean;
  temFoto: boolean;
}

export type HonorPending = 'sem-data' | 'sem-ato' | 'sem-diploma';

export const HONOR_PENDING_LABELS: Record<HonorPending, string> = {
  'sem-data': 'Sem data',
  'sem-ato': 'Sem número do ato',
  'sem-diploma': 'Sem diploma digitalizado',
};

export function honorPendings(row: HonorRow): HonorPending[] {
  const out: HonorPending[] = [];
  if (!row.data) out.push('sem-data');
  if (!row.numeroAto) out.push('sem-ato');
  if (!row.temDiploma) out.push('sem-diploma');
  return out;
}

const yearOf = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(
    new Date(iso),
  );

export interface HonorFilters {
  query: string;
  tipo: string;
  year: string;
  pending: string;
}

export function filterHonors(rows: HonorRow[], filters: HonorFilters): HonorRow[] {
  const needle = normalizeForSearch(filters.query.trim());
  return rows.filter((row) => {
    if (filters.tipo !== 'Todos' && row.tipo !== filters.tipo) return false;
    if (filters.year !== 'Todos' && (!row.data || yearOf(row.data) !== filters.year)) return false;
    if (
      filters.pending !== 'Todos' &&
      !honorPendings(row).includes(filters.pending as HonorPending)
    )
      return false;
    if (!needle) return true;
    return normalizeForSearch(`${row.homenageado} ${row.nomeOficial} ${row.instituicao}`).includes(
      needle,
    );
  });
}

export function honorYears(rows: HonorRow[]): string[] {
  return [...new Set(rows.filter((r) => r.data).map((r) => yearOf(r.data!)))].sort().reverse();
}

export function honorSummary(rows: HonorRow[]) {
  const byTipo = new Map<HonorTypeKey, number>();
  for (const row of rows) byTipo.set(row.tipo, (byTipo.get(row.tipo) ?? 0) + 1);
  return {
    total: rows.length,
    byTipo,
    externos: rows.filter((r) => !r.memberId).length,
    incompletas: rows.filter((r) => honorPendings(r).length > 0).length,
  };
}
