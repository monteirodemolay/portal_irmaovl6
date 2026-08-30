import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import { isCentralProfileVisible } from '../entities/publication-settings.entity';
import {
  buildPublicMemberProfileDTO,
  type PublicMemberProfileDTO,
} from '../dtos/public-member-profile.dto';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import { getMemberJourneyCargos } from '../../governance/lib/get-member-journey';
import type { IArchiveMediaRepository } from '../../archive/repositories/archive-media.repository';
import type { IMediaAssetRepository } from '../../archive/repositories/media-asset.repository';

export interface GetPublicMemberProfileDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  publicationSettingsRepository: IPublicationSettingsRepository;
  memberPositionHistoryRepository: IMemberPositionHistoryRepository;
  boardTermRepository: IBoardTermRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  mediaAssetRepository: IMediaAssetRepository;
}

/**
 * Perfil de terceiro na Central — `null` cobre igualmente "nunca publicou"
 * e "suspenso pela Administração" (nunca revela qual dos dois é, requisito
 * de privacidade explícito). Isolamento multi-tenant: `memberId` de outro
 * tenant também devolve `null`, nunca um erro que revele a existência do
 * documento.
 */
export class GetPublicMemberProfileUseCase {
  constructor(private readonly deps: GetPublicMemberProfileDeps) {}

  async execute(
    ctx: AuthContext,
    targetMemberId: string,
  ): Promise<Result<PublicMemberProfileDTO | null>> {
    requirePermission(ctx, 'memberDirectory:read');

    const member = await this.deps.memberRepository.findById(targetMemberId);
    if (!member || member.tenantId !== ctx.tenantId) {
      return ok(null);
    }

    const settings = await this.deps.publicationSettingsRepository.findByMemberId(
      ctx.tenantId,
      targetMemberId,
    );
    if (!isCentralProfileVisible(settings)) {
      return ok(null);
    }

    const profile = await this.deps.memberCentralProfileRepository.findByMemberId(
      ctx.tenantId,
      targetMemberId,
    );
    const dto = buildPublicMemberProfileDTO(member, profile, settings);

    // Trajetória institucional — mesmo recorte do Acervo VL6 (registro da
    // Loja, não preferência pessoal), por isso não passa pelos blocos de
    // `PublicationSettings`: se o perfil chegou até aqui (já visível), a
    // trajetória sempre acompanha.
    const cargos = await getMemberJourneyCargos(this.deps, targetMemberId);

    // Memória fotográfica — ponte Diretório → Acervo (Fase B). Ao contrário
    // da trajetória institucional, é claramente preferência do titular, por
    // isso passa pelo bloco `memoriaFotografica`. Filtro deliberadamente
    // conservador: só publicado e nunca nível "administracao", mesmo para
    // quem vê o Diretório com sessão de Administrador — o Acervo VL6 é a
    // superfície certa para mídia restrita, não o perfil público.
    let memoriaFotografica: PublicMemberProfileDTO['memoriaFotografica'] = null;
    if (settings.blocks.memoriaFotografica) {
      const taggedMedia = await this.deps.archiveMediaRepository.findByPessoaIdentificada(
        ctx.tenantId,
        targetMemberId,
      );
      const publishedMedia = taggedMedia.filter(
        (media) =>
          media.mediaType === 'foto' &&
          media.publicacaoStatus === 'publicado' &&
          media.accessLevel !== 'administracao',
      );
      const assets = await Promise.all(
        publishedMedia.map((media) => this.deps.mediaAssetRepository.findById(media.mediaAssetId)),
      );
      memoriaFotografica = publishedMedia
        .map((media, index) => {
          const asset = assets[index];
          if (!asset || asset.deletedAt) return null;
          return {
            id: media.id,
            src: `/api/archive-media/${media.id}`,
            caption: media.caption ?? asset.originalName,
          };
        })
        .filter((entry): entry is { id: string; src: string; caption: string } => entry !== null);
    }

    return ok({
      ...dto,
      trajetoria: {
        dataIniciacao: member.dataIniciacao,
        dataElevacao: member.dataElevacao,
        dataExaltacao: member.dataExaltacao,
        cargos,
      },
      memoriaFotografica,
    });
  }
}
