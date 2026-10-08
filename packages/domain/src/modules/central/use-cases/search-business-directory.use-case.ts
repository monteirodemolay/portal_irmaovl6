import { normalizeForSearch, type SearchSuggestion } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import {
  buildPublicMemberProfileDTO,
  type PublicMemberProfileDTO,
} from '../dtos/public-member-profile.dto';
import type { BusinessDirectoryEntryDTO } from '../dtos/business-directory-entry.dto';
import {
  computeBusinessDirectoryFilterOptions,
  type BusinessDirectoryFilterOptions,
} from '../lib/business-directory-metrics';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface SearchBusinessDirectoryDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  publicationSettingsRepository: IPublicationSettingsRepository;
}

export interface SearchBusinessDirectoryInput {
  termo?: string;
  segmento?: string;
  cidade?: string;
  atendeOnline?: boolean;
  ofereceDescontoIrmaos?: boolean;
}

export interface SearchBusinessDirectoryOutput {
  items: BusinessDirectoryEntryDTO[];
  totalEmpresas: number;
  searchSuggestions: SearchSuggestion[];
  filterOptions: BusinessDirectoryFilterOptions;
}

/**
 * "Negócios & Serviços" — achata `negocios[]` de todo perfil publicado num
 * card por empresa/atividade (mesmo scan em memória de `SearchDirectoryUseCase`,
 * já validado pra não precisar índice composto no Firestore). Sempre parte do
 * `PublicMemberProfileDTO` já filtrado — um negócio só aparece aqui se o
 * bloco "empresa" da Central estiver ligado, nunca lendo `negocios` bruto de
 * `MemberCentralProfile`.
 */
export class SearchBusinessDirectoryUseCase {
  constructor(private readonly deps: SearchBusinessDirectoryDeps) {}

  async execute(
    ctx: AuthContext,
    input: SearchBusinessDirectoryInput = {},
  ): Promise<Result<SearchBusinessDirectoryOutput>> {
    requirePermission(ctx, 'memberDirectory:read');

    const refs = await this.deps.publicationSettingsRepository.listPublishedByTenant(ctx.tenantId);

    const dtos = await Promise.all(
      refs.map(async (ref) => {
        const [member, settings, profile] = await Promise.all([
          this.deps.memberRepository.findById(ref.memberId),
          this.deps.publicationSettingsRepository.findByMemberId(ctx.tenantId, ref.memberId),
          this.deps.memberCentralProfileRepository.findByMemberId(ctx.tenantId, ref.memberId),
        ]);
        if (!member || !settings) return null;
        return buildPublicMemberProfileDTO(member, profile, settings);
      }),
    );

    const allItems: BusinessDirectoryEntryDTO[] = dtos
      .filter((dto): dto is PublicMemberProfileDTO => dto !== null)
      .flatMap((dto) =>
        (dto.negocios ?? []).map((negocio) => ({
          businessId: negocio.id,
          nomeEmpresa: negocio.nomeEmpresa,
          segmento: negocio.segmento,
          cargo: negocio.cargo,
          descricao: negocio.descricao,
          cidade: negocio.cidade,
          telefoneComercial: negocio.telefoneComercial,
          siteUrl: negocio.siteUrl,
          logoUrl: negocio.logoUrl,
          produtosServicos: negocio.produtosServicos,
          whatsappComercial: negocio.whatsappComercial,
          emailComercial: negocio.emailComercial,
          instagramComercial: negocio.instagramComercial,
          formasAtendimento: negocio.formasAtendimento,
          horarioFuncionamento: negocio.horarioFuncionamento,
          ofereceDescontoIrmaos: negocio.ofereceDescontoIrmaos,
          descontoDescricao: negocio.descontoDescricao,
          responsavel: {
            memberId: dto.memberId,
            nomeCompleto: dto.nomeCompleto,
            fotoUrl: dto.fotoUrl,
            dataIniciacao: dto.dataIniciacao,
            dataFalecimento: dto.dataFalecimento,
          },
        })),
      );

    const filterOptions = computeBusinessDirectoryFilterOptions(allItems);

    let items = allItems;

    if (input.segmento?.trim()) {
      const needleSegmento = normalizeForSearch(input.segmento.trim());
      items = items.filter((entry) => normalizeForSearch(entry.segmento).includes(needleSegmento));
    }

    if (input.cidade?.trim()) {
      const needleCidade = normalizeForSearch(input.cidade.trim());
      items = items.filter((entry) => normalizeForSearch(entry.cidade).includes(needleCidade));
    }

    if (input.atendeOnline) {
      items = items.filter((entry) => entry.formasAtendimento.includes('online'));
    }

    if (input.ofereceDescontoIrmaos) {
      items = items.filter((entry) => entry.ofereceDescontoIrmaos);
    }

    const searchSuggestions = items.map((dto) => ({
      label: dto.nomeEmpresa,
      href: `/irmaos/${dto.responsavel.memberId}`,
      text: [
        dto.nomeEmpresa,
        dto.segmento,
        dto.descricao,
        dto.cidade,
        dto.responsavel.nomeCompleto,
        ...dto.produtosServicos,
      ]
        .filter(Boolean)
        .join(' '),
    }));

    const needle = normalizeForSearch(input.termo?.trim());
    if (needle) {
      items = items.filter((entry) =>
        normalizeForSearch(
          [
            entry.nomeEmpresa,
            entry.segmento,
            entry.descricao,
            entry.cidade,
            entry.responsavel.nomeCompleto,
            ...entry.produtosServicos,
          ]
            .filter((v): v is string => Boolean(v))
            .join(' '),
        ).includes(needle),
      );
    }

    return ok({ items, searchSuggestions, totalEmpresas: allItems.length, filterOptions });
  }
}
