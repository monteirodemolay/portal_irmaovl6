import type { AreaAtuacaoKey, MemberDegree, MemberSituationStatus } from '@vl6/shared';
import { getBoardPositionLabel } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import { buildDirectoryMemberDTO, type DirectoryMemberDTO } from '../dtos/directory-member.dto';
import {
  computeAreaFacets,
  computeDirectoryFilterOptions,
  computeDirectoryMetrics,
  type AreaFacet,
  type DirectoryFilterOptions,
  type DirectoryMetrics,
} from '../lib/directory-metrics';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { IBoardPositionAssignmentRepository } from '../../governance/repositories/board-position-assignment.repository';
import type { ICommitteeRepository } from '../../governance/repositories/committee.repository';

export interface SearchDirectoryDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  publicationSettingsRepository: IPublicationSettingsRepository;
  boardTermRepository: IBoardTermRepository;
  boardPositionAssignmentRepository: IBoardPositionAssignmentRepository;
  committeeRepository: ICommitteeRepository;
}

export interface SearchDirectoryInput {
  termo?: string;
  profissao?: string;
  areaAtuacao?: AreaAtuacaoKey;
  competencia?: string;
  servico?: string;
  /** Competência OU serviço — filtro único da UI, que mescla os dois campos (ver `computeDirectoryFilterOptions`). */
  tag?: string;
  empresa?: string;
  cidade?: string;
  grau?: MemberDegree;
  /**
   * Situação institucional — todo Irmão não excluído pertence ao Diretório
   * (regra central desta fase), então SEM este filtro o resultado inclui
   * TODAS as situações ("Todos" é o padrão visível na UI, nunca um valor
   * único). Passar um valor filtra pra só aquela situação.
   */
  situacao?: MemberSituationStatus;
  /** Cargo institucional na gestão vigente (rótulo de exibição, ex.: "Secretário"). */
  cargo?: string;
  /** Nome de uma comissão da gestão vigente. */
  comissao?: string;
  /** "Possui perfil enriquecido" — só quem tem `profileState === 'published'`. */
  perfilEnriquecido?: boolean;
  /** "Possui negócio publicado" — só quem tem ao menos 1 negócio aprovado visível. */
  negocioPublicado?: boolean;
}

export interface SearchDirectoryOutput {
  items: DirectoryMemberDTO[];
  metrics: DirectoryMetrics;
  areaFacets: AreaFacet[];
  filterOptions: DirectoryFilterOptions;
}

/**
 * Limite generoso pra buscar "o tenant inteiro" numa só chamada — Lojas
 * maçônicas são pequenas (dezenas a poucas centenas de Irmãos), não exige
 * paginação de verdade (mesmo precedente de `SearchMembersUseCase` ao
 * resolver titulares de cargo, que já busca com um limite alto de propósito
 * em vez de paginar). Ainda assim faz mais de uma página se precisar, pra
 * nunca truncar silenciosamente um tenant fora da curva.
 */
const FETCH_PAGE_LIMIT = 500;
const MAX_FETCH_PAGES = 10;

/**
 * Diretório/busca institucional — regra central (docs/architecture, GLEG):
 * "todo Irmão institucional não excluído pertence ao Diretório". Começa
 * SEMPRE de `memberRepository` (nunca de `PublicationSettings`) e depois
 * enriquece cada Irmão com `MemberCentralProfile`/`PublicationSettings`
 * (opcionais — nunca portões de existência) e com cargo/comissão da gestão
 * vigente (sempre institucional). Todo filtro de conteúdo voluntário roda
 * sobre `DirectoryMemberDTO.optional` (já filtrado por autorização), nunca
 * sobre campo bruto — um Irmão com profissão "Médico" mas bloco
 * profissional desligado não aparece buscando "médico". `metrics`/
 * `areaFacets`/`filterOptions` são computados sobre o conjunto COMPLETO
 * (institucional, antes de qualquer filtro), pra que os indicadores do
 * Diretório sempre reflitam o total, não o resultado da busca atual.
 */
export class SearchDirectoryUseCase {
  constructor(private readonly deps: SearchDirectoryDeps) {}

  async execute(
    ctx: AuthContext,
    input: SearchDirectoryInput = {},
  ): Promise<Result<SearchDirectoryOutput>> {
    requirePermission(ctx, 'memberDirectory:read');

    const activeTerm = await this.deps.boardTermRepository.findActive(ctx.tenantId);

    const [members, profiles, settingsList, assignments, committees] = await Promise.all([
      this.fetchAllMembers(ctx.tenantId),
      this.deps.memberCentralProfileRepository.listByTenant(ctx.tenantId),
      this.deps.publicationSettingsRepository.listByTenant(ctx.tenantId),
      activeTerm ? this.deps.boardPositionAssignmentRepository.listByGestao(activeTerm.id) : [],
      activeTerm ? this.deps.committeeRepository.listByGestao(activeTerm.id) : [],
    ]);

    const cargoByMember = new Map(
      assignments.map((a) => [a.memberId, getBoardPositionLabel(a.cargo)]),
    );
    const comissoesByMember = new Map<string, Array<{ id: string; nome: string }>>();
    for (const committee of committees) {
      for (const memberId of committee.membrosIds) {
        const list = comissoesByMember.get(memberId) ?? [];
        list.push({ id: committee.id, nome: committee.nome });
        comissoesByMember.set(memberId, list);
      }
    }

    const profileByMember = new Map(profiles.map((p) => [p.memberId, p]));
    const settingsByMember = new Map(settingsList.map((s) => [s.memberId, s]));

    const allItems: DirectoryMemberDTO[] = members
      // Defesa em profundidade: reforça tenant + soft-delete mesmo que o
      // repositório já filtre — nunca depende só do repositório pra isolar
      // tenant/exclusão de um dado que decide quem aparece no Diretório.
      .filter((m) => m.tenantId === ctx.tenantId && m.deletedAt === null)
      .map((member) =>
        buildDirectoryMemberDTO(
          member,
          profileByMember.get(member.id) ?? null,
          settingsByMember.get(member.id) ?? null,
          {
            cargoAtual: cargoByMember.get(member.id) ?? null,
            comissoes: comissoesByMember.get(member.id) ?? [],
          },
        ),
      );

    const metrics = computeDirectoryMetrics(allItems);
    const areaFacets = computeAreaFacets(allItems);
    const filterOptions = computeDirectoryFilterOptions(allItems);

    let items = allItems;

    if (input.situacao) {
      items = items.filter((dto) => dto.situacao === input.situacao);
    }

    if (input.grau) {
      items = items.filter((dto) => dto.grau === input.grau);
    }

    const needle = input.termo?.trim().toLowerCase();
    if (needle) {
      items = items.filter((dto) => {
        const haystack = [
          dto.nomeCompleto,
          dto.cargoAtual,
          ...dto.comissoes.map((c) => c.nome),
          dto.optional.profissional?.profissao,
          dto.optional.profissional?.areaAtuacao,
          dto.optional.profissional?.resumoProfissional,
          dto.optional.empresaAtual,
          ...(dto.optional.negocios?.map((n) => n.nomeEmpresa) ?? []),
          ...(dto.optional.competencias ?? []),
          ...(dto.optional.servicos ?? []),
        ]
          .filter((v): v is string => Boolean(v))
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    if (input.profissao?.trim()) {
      const needleProfissao = input.profissao.trim().toLowerCase();
      items = items.filter((dto) =>
        dto.optional.profissional?.profissao?.toLowerCase().includes(needleProfissao),
      );
    }

    if (input.areaAtuacao) {
      items = items.filter(
        (dto) => dto.optional.profissional?.areaAtuacaoKey === input.areaAtuacao,
      );
    }

    if (input.competencia?.trim()) {
      const needleCompetencia = input.competencia.trim().toLowerCase();
      items = items.filter((dto) =>
        dto.optional.competencias?.some((c) => c.toLowerCase() === needleCompetencia),
      );
    }

    if (input.servico?.trim()) {
      const needleServico = input.servico.trim().toLowerCase();
      items = items.filter((dto) =>
        dto.optional.servicos?.some((s) => s.toLowerCase() === needleServico),
      );
    }

    if (input.tag?.trim()) {
      const needleTag = input.tag.trim().toLowerCase();
      items = items.filter(
        (dto) =>
          dto.optional.competencias?.some((c) => c.toLowerCase() === needleTag) ||
          dto.optional.servicos?.some((s) => s.toLowerCase() === needleTag),
      );
    }

    if (input.empresa?.trim()) {
      const needleEmpresa = input.empresa.trim().toLowerCase();
      items = items.filter((dto) => {
        const empresas = [
          dto.optional.empresaAtual,
          ...(dto.optional.negocios?.map((n) => n.nomeEmpresa) ?? []),
        ].filter((v): v is string => Boolean(v));
        return empresas.some((e) => e.toLowerCase().includes(needleEmpresa));
      });
    }

    if (input.cidade?.trim()) {
      const needleCidade = input.cidade.trim().toLowerCase();
      items = items.filter((dto) =>
        dto.optional.cidadeExibicao?.toLowerCase().includes(needleCidade),
      );
    }

    if (input.cargo?.trim()) {
      const needleCargo = input.cargo.trim().toLowerCase();
      items = items.filter((dto) => dto.cargoAtual?.toLowerCase() === needleCargo);
    }

    if (input.comissao?.trim()) {
      const needleComissao = input.comissao.trim().toLowerCase();
      items = items.filter((dto) =>
        dto.comissoes.some((c) => c.nome.toLowerCase() === needleComissao),
      );
    }

    if (input.perfilEnriquecido) {
      items = items.filter((dto) => dto.profileState === 'published');
    }

    if (input.negocioPublicado) {
      items = items.filter((dto) => (dto.optional.negocios?.length ?? 0) > 0);
    }

    return ok({ items, metrics, areaFacets, filterOptions });
  }

  /** Busca o tenant inteiro em páginas — ver comentário de `FETCH_PAGE_LIMIT`. */
  private async fetchAllMembers(tenantId: string) {
    const all = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_FETCH_PAGES; page++) {
      const result = await this.deps.memberRepository.search(
        { tenantId },
        { limit: FETCH_PAGE_LIMIT, cursor },
      );
      all.push(...result.items);
      if (!result.hasMore || !result.nextCursor) break;
      cursor = result.nextCursor;
    }
    return all;
  }
}
