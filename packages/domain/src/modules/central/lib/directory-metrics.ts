import { AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import type { PublicMemberProfileDTO } from '../dtos/public-member-profile.dto';

export interface DirectoryMetrics {
  totalIrmaos: number;
  totalAreas: number;
  totalEmpresas: number;
  totalCompetenciasCompartilhadas: number;
}

export interface AreaFacet {
  key: AreaAtuacaoKey;
  label: string;
  count: number;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Indicadores-resumo do Diretório — sempre computados sobre o conjunto
 * COMPLETO de perfis publicados (nunca sobre o resultado já filtrado por
 * busca), pra que os cards de indicadores reflitam o diretório inteiro
 * independente do termo pesquisado no momento.
 */
export function computeDirectoryMetrics(dtos: PublicMemberProfileDTO[]): DirectoryMetrics {
  const areas = new Set<string>();
  const empresas = new Set<string>();
  const competencias = new Set<string>();

  for (const dto of dtos) {
    if (dto.profissional?.areaAtuacaoKey) areas.add(dto.profissional.areaAtuacaoKey);
    if (dto.empresaAtual) empresas.add(normalize(dto.empresaAtual));
    for (const negocio of dto.negocios ?? []) empresas.add(normalize(negocio.nomeEmpresa));
    for (const item of dto.competencias ?? []) competencias.add(normalize(item));
    for (const item of dto.servicos ?? []) competencias.add(normalize(item));
  }

  return {
    totalIrmaos: dtos.length,
    totalAreas: areas.size,
    totalEmpresas: empresas.size,
    totalCompetenciasCompartilhadas: competencias.size,
  };
}

/** Contagem de Irmãos por área de atuação — só áreas com pelo menos 1, ordenado desc. */
export function computeAreaFacets(dtos: PublicMemberProfileDTO[]): AreaFacet[] {
  const counts = new Map<AreaAtuacaoKey, number>();

  for (const dto of dtos) {
    const key = dto.profissional?.areaAtuacaoKey;
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: AREA_ATUACAO_LABELS[key], count }))
    .sort((a, b) => b.count - a.count);
}
