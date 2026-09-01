import { AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import type { DirectoryMemberDTO } from '../dtos/directory-member.dto';

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
 * Indicadores-resumo do Diretório — computados sobre o conjunto COMPLETO de
 * Irmãos institucionais (nunca sobre o resultado já filtrado por busca),
 * pra que os cards de indicadores reflitam o diretório inteiro independente
 * do termo pesquisado no momento. Só o conteúdo AUTORIZADO
 * (`dto.optional.*`) entra nas contagens — Irmãos sem perfil publicado
 * contam só pra `totalIrmaos`.
 */
export function computeDirectoryMetrics(dtos: DirectoryMemberDTO[]): DirectoryMetrics {
  const areas = new Set<string>();
  const empresas = new Set<string>();
  const competencias = new Set<string>();

  for (const dto of dtos) {
    if (dto.optional.profissional?.areaAtuacaoKey) areas.add(dto.optional.profissional.areaAtuacaoKey);
    if (dto.optional.empresaAtual) empresas.add(normalize(dto.optional.empresaAtual));
    for (const negocio of dto.optional.negocios ?? []) empresas.add(normalize(negocio.nomeEmpresa));
    for (const item of dto.optional.competencias ?? []) competencias.add(normalize(item));
    for (const item of dto.optional.servicos ?? []) competencias.add(normalize(item));
  }

  return {
    totalIrmaos: dtos.length,
    totalAreas: areas.size,
    totalEmpresas: empresas.size,
    totalCompetenciasCompartilhadas: competencias.size,
  };
}

/** Contagem de Irmãos por área de atuação — só áreas com pelo menos 1, ordenado desc. */
export function computeAreaFacets(dtos: DirectoryMemberDTO[]): AreaFacet[] {
  const counts = new Map<AreaAtuacaoKey, number>();

  for (const dto of dtos) {
    const key = dto.optional.profissional?.areaAtuacaoKey;
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
  /** Cargos institucionais (gestão vigente) ocupados por algum Irmão do conjunto — sempre institucional, nunca depende de publicação. */
  cargos: DirectoryFilterOption[];
  /** Comissões (gestão vigente) com pelo menos um Irmão do conjunto. */
  comissoes: DirectoryFilterOption[];
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
 * "Só o que realmente existe cadastrado" — o Diretório usa seletores
 * fechados nessas opções (docs/architecture), pra nunca deixar o Irmão
 * filtrar/buscar por algo que ninguém tem. Sempre computado sobre o
 * conjunto COMPLETO de Irmãos institucionais, igual `computeDirectoryMetrics`/
 * `computeAreaFacets` — os filtros disponíveis não encolhem conforme o
 * usuário já filtra. `profissoes`/`tags`/`empresas` só refletem conteúdo já
 * autorizado (`optional.*`); `cargos`/`comissoes` são institucionais, nunca
 * gated por publicação.
 */
export function computeDirectoryFilterOptions(dtos: DirectoryMemberDTO[]): DirectoryFilterOptions {
  function* profissoes() {
    for (const dto of dtos)
      if (dto.optional.profissional?.profissao) yield dto.optional.profissional.profissao;
  }
  function* cidades() {
    for (const dto of dtos) if (dto.optional.cidadeExibicao) yield dto.optional.cidadeExibicao;
  }
  function* tags() {
    for (const dto of dtos) {
      yield* dto.optional.competencias ?? [];
      yield* dto.optional.servicos ?? [];
    }
  }
  function* empresas() {
    for (const dto of dtos) {
      if (dto.optional.empresaAtual) yield dto.optional.empresaAtual;
      for (const negocio of dto.optional.negocios ?? []) yield negocio.nomeEmpresa;
    }
  }
  function* cargos() {
    for (const dto of dtos) if (dto.cargoAtual) yield dto.cargoAtual;
  }
  function* comissoes() {
    for (const dto of dtos) for (const c of dto.comissoes) yield c.nome;
  }

  return {
    profissoes: countDistinct(profissoes()),
    cidades: countDistinct(cidades()),
    tags: countDistinct(tags()),
    empresas: countDistinct(empresas()),
    cargos: countDistinct(cargos()),
    comissoes: countDistinct(comissoes()),
  };
}
