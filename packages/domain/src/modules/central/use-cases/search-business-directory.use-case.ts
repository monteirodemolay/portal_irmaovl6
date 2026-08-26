import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import {
  buildPublicMemberProfileDTO,
  type PublicMemberProfileDTO,
} from '../dtos/public-member-profile.dto';
import type { BusinessDirectoryEntryDTO } from '../dtos/business-directory-entry.dto';
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
}

export interface SearchBusinessDirectoryOutput {
  items: BusinessDirectoryEntryDTO[];
  totalEmpresas: number;
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
          },
        })),
      );

    let items = allItems;

    const needle = input.termo?.trim().toLowerCase();
    if (needle) {
      items = items.filter((entry) =>
        [
          entry.nomeEmpresa,
          entry.segmento,
          entry.descricao,
          entry.cidade,
          entry.responsavel.nomeCompleto,
          ...entry.produtosServicos,
        ]
          .filter((v): v is string => Boolean(v))
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }

    if (input.segmento?.trim()) {
      const needleSegmento = input.segmento.trim().toLowerCase();
      items = items.filter((entry) => entry.segmento?.toLowerCase().includes(needleSegmento));
    }

    if (input.cidade?.trim()) {
      const needleCidade = input.cidade.trim().toLowerCase();
      items = items.filter((entry) => entry.cidade?.toLowerCase().includes(needleCidade));
    }

    if (input.atendeOnline) {
      items = items.filter((entry) => entry.formasAtendimento.includes('online'));
    }

    return ok({ items, totalEmpresas: allItems.length });
  }
}
