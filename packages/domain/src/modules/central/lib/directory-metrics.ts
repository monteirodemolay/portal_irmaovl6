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

export interface DirectoryFilterOption {
  value: string;
  count: number;
}

export interface DirectoryFilterOptions {
  profissoes: DirectoryFilterOption[];
  cidades: DirectoryFilterOption[];
  /** Competências e serviços mesclados num único conjunto — mesmo critério já usado em `computeDirectoryMetrics`. */
  tags: DirectoryFilterOption[];
  empresas: DirectoryFilterOption[];
}

function countDistinct(values: Iterable<string>): DirectoryFilterOption[] {
  const counts = new Map<string, { value: string; count: number }>();
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalize(trimmed);
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { value: trimmed, count: 1 });
  }
  return Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.value.localeCompare(b.value, 'pt-BR'),
  );
}

/**
 * "Só o que realmente existe cadastrado" — o Diretório trocou campos de
 * texto livre por seletores fechados nessas opções (docs/architecture),
 * pra nunca deixar o Irmão filtrar/buscar por algo que ninguém publicou.
 * Sempre computado sobre o conjunto COMPLETO de perfis publicados, igual
 * `computeDirectoryMetrics`/`computeAreaFacets` — os filtros disponíveis
 * não encolhem conforme o usuário já filtra.
 */
export function computeDirectoryFilterOptions(dtos: PublicMemberProfileDTO[]): DirectoryFilterOptions {
  function* profissoes() {
    for (const dto of dtos) if (dto.profissional?.profissao) yield dto.profissional.profissao;
  }
  function* cidades() {
    for (const dto of dtos)
      if (dto.informacoesPessoais?.cidadeExibicao) yield dto.informacoesPessoais.cidadeExibicao;
  }
  function* tags() {
    for (const dto of dtos) {
      yield* dto.competencias ?? [];
      yield* dto.servicos ?? [];
    }
  }
  function* empresas() {
    for (const dto of dtos) {
      if (dto.empresaAtual) yield dto.empresaAtual;
      for (const negocio of dto.negocios ?? []) yield negocio.nomeEmpresa;
    }
  }

  return {
    profissoes: countDistinct(profissoes()),
    cidades: countDistinct(cidades()),
    tags: countDistinct(tags()),
    empresas: countDistinct(empresas()),
  };
}
