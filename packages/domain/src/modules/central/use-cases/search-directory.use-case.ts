import type { AreaAtuacaoKey, MemberSituationStatus } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { hasPermission, requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import {
  buildPublicMemberProfileDTO,
  type PublicMemberProfileDTO,
} from '../dtos/public-member-profile.dto';
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

export interface SearchDirectoryDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  publicationSettingsRepository: IPublicationSettingsRepository;
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
  /**
   * Só quem tem `member:read` pode pedir uma situação diferente de `ativo`
   * (docs pedidos pelo Administrador §10: "permitir filtros autorizados
   * por situação"). Sem esse filtro, o Diretório sempre mostra só Irmãos
   * `ativo` — quem está licenciado, suspenso, desligado ou falecido não
   * aparece na busca comum, mesmo com o perfil publicado.
   */
  situacao?: MemberSituationStatus;
}

export interface SearchDirectoryOutput {
  items: PublicMemberProfileDTO[];
  metrics: DirectoryMetrics;
  areaFacets: AreaFacet[];
  filterOptions: DirectoryFilterOptions;
}

/**
 * Diretório/busca — só sobre perfis publicados (requisito central). Sem
 * full-text nativo no Firestore: mesma estratégia de `SearchMembersUseCase`
 * (filtro estruturado no repositório + filtro de texto em memória, no
 * servidor). Crítico: todo filtro (texto livre ou estruturado) roda sobre o
 * DTO já publicado, nunca sobre campo bruto de `Member`/`MemberCentralProfile`
 * — um Irmão com profissão "Médico" mas bloco profissional desligado não
 * aparece buscando "médico". `metrics`/`areaFacets` são computados sobre o
 * conjunto COMPLETO de perfis publicados (antes de qualquer filtro), pra que
 * os indicadores/cards de área do Diretório sempre reflitam o total, não o
 * resultado da busca atual.
 */
export class SearchDirectoryUseCase {
  constructor(private readonly deps: SearchDirectoryDeps) {}

  async execute(
    ctx: AuthContext,
    input: SearchDirectoryInput = {},
  ): Promise<Result<SearchDirectoryOutput>> {
    requirePermission(ctx, 'memberDirectory:read');

    // Sem `situacao` explícito, o Diretório só mostra Irmãos `ativo` (docs
    // pedidos pelo Administrador §10) — quem pede uma situação diferente
    // (licenciado/suspenso/desligado/falecido) precisa de `member:read`,
    // mesma permissão que já dá acesso à ficha administrativa do Irmão.
    const situacaoFiltro =
      input.situacao && hasPermission(ctx, 'member:read') ? input.situacao : 'ativo';

    const refs = await this.deps.publicationSettingsRepository.listPublishedByTenant(ctx.tenantId);

    const dtos = await Promise.all(
      refs.map(async (ref) => {
        const [member, settings, profile] = await Promise.all([
          this.deps.memberRepository.findById(ref.memberId),
          this.deps.publicationSettingsRepository.findByMemberId(ctx.tenantId, ref.memberId),
          this.deps.memberCentralProfileRepository.findByMemberId(ctx.tenantId, ref.memberId),
        ]);
        if (!member || !settings) return null;
        if (member.situacao !== situacaoFiltro) return null;
        return buildPublicMemberProfileDTO(member, profile, settings);
      }),
    );

    const allItems = dtos.filter((dto): dto is PublicMemberProfileDTO => dto !== null);

    const metrics = computeDirectoryMetrics(allItems);
    const areaFacets = computeAreaFacets(allItems);
    const filterOptions = computeDirectoryFilterOptions(allItems);

    let items = allItems;

    const needle = input.termo?.trim().toLowerCase();
    if (needle) {
      items = items.filter((dto) => {
        const haystack = [
          dto.nomeCompleto,
          dto.profissional?.profissao,
          dto.profissional?.areaAtuacao,
          dto.profissional?.resumoProfissional,
          dto.empresaAtual,
          ...(dto.negocios?.map((n) => n.nomeEmpresa) ?? []),
          ...(dto.competencias ?? []),
          ...(dto.servicos ?? []),
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
        dto.profissional?.profissao?.toLowerCase().includes(needleProfissao),
      );
    }

    if (input.areaAtuacao) {
      items = items.filter((dto) => dto.profissional?.areaAtuacaoKey === input.areaAtuacao);
    }

    if (input.competencia?.trim()) {
      const needleCompetencia = input.competencia.trim().toLowerCase();
      items = items.filter((dto) =>
        dto.competencias?.some((c) => c.toLowerCase() === needleCompetencia),
      );
    }

    if (input.servico?.trim()) {
      const needleServico = input.servico.trim().toLowerCase();
      items = items.filter((dto) => dto.servicos?.some((s) => s.toLowerCase() === needleServico));
    }

    if (input.tag?.trim()) {
      const needleTag = input.tag.trim().toLowerCase();
      items = items.filter(
        (dto) =>
          dto.competencias?.some((c) => c.toLowerCase() === needleTag) ||
          dto.servicos?.some((s) => s.toLowerCase() === needleTag),
      );
    }

    if (input.empresa?.trim()) {
      const needleEmpresa = input.empresa.trim().toLowerCase();
      items = items.filter((dto) => {
        const empresas = [
          dto.empresaAtual,
          ...(dto.negocios?.map((n) => n.nomeEmpresa) ?? []),
        ].filter((v): v is string => Boolean(v));
        return empresas.some((e) => e.toLowerCase().includes(needleEmpresa));
      });
    }

    if (input.cidade?.trim()) {
      const needleCidade = input.cidade.trim().toLowerCase();
      items = items.filter((dto) =>
        dto.informacoesPessoais?.cidadeExibicao?.toLowerCase().includes(needleCidade),
      );
    }

    return ok({ items, metrics, areaFacets, filterOptions });
  }
}
