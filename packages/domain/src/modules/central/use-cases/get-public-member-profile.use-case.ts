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
import type { ICommitteeRepository } from '../../governance/repositories/committee.repository';
import {
  getMemberJourneyCargos,
  getMemberJourneyCommittees,
} from '../../governance/lib/get-member-journey';
import type { IArchiveMediaRepository } from '../../archive/repositories/archive-media.repository';
import type { IMediaAssetRepository } from '../../archive/repositories/media-asset.repository';

export interface GetPublicMemberProfileDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  publicationSettingsRepository: IPublicationSettingsRepository;
  memberPositionHistoryRepository: IMemberPositionHistoryRepository;
  boardTermRepository: IBoardTermRepository;
  committeeRepository: ICommitteeRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  mediaAssetRepository: IMediaAssetRepository;
}

/**
 * Perfil de terceiro na Central — regra central desta fase: todo Irmão
 * institucional não excluído tem uma ficha que abre (nunca 404), mesmo sem
 * nenhum conteúdo voluntário publicado. `null` fica reservado só pra "esse
 * Irmão não existe neste tenant" (Irmão não encontrado, outro tenant, ou
 * excluído) — nunca mais representa "não publicou"/"suspenso", que agora é
 * uma ficha institucional normal com os blocos voluntários vazios (mesmo
 * tratamento pro titular que nunca publicou e pro suspenso pela
 * Administração — nunca revela qual dos dois é, requisito de privacidade
 * explícito).
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
    // `null` aqui cobre igualmente "nunca publicou" e "suspenso" — os dois
    // casos devolvem a mesma ficha institucional com blocos voluntários
    // fechados (`buildPublicMemberProfileDTO` trata `settings: null` como
    // "tudo fechado"), nunca `ok(null)`: só um Irmão que não existe neste
    // tenant (não encontrado/outro tenant/excluído) devolve null.
    const visibleSettings = isCentralProfileVisible(settings) ? settings : null;

    const profile = await this.deps.memberCentralProfileRepository.findByMemberId(
      ctx.tenantId,
      targetMemberId,
    );
    const dto = buildPublicMemberProfileDTO(member, profile, visibleSettings);

    // Trajetória institucional — mesmo recorte do Acervo VL6 (registro da
    // Loja, não preferência pessoal), por isso não passa pelos blocos de
    // `PublicationSettings`: todo Irmão institucional tem sua trajetória
    // exibida, publicado ou não. Cargos de Diretoria e comissões são dois
    // registros distintos (`ICommitteeRepository` não deriva de
    // `IMemberPositionHistoryRepository`), por isso duas chamadas.
    const [cargos, comissoes] = await Promise.all([
      getMemberJourneyCargos(this.deps, targetMemberId),
      getMemberJourneyCommittees(this.deps, ctx.tenantId, targetMemberId),
    ]);

    // Memória fotográfica — ponte Diretório → Acervo (Fase B). Ao contrário
    // da trajetória institucional, é claramente preferência do titular, por
    // isso passa pelo bloco `memoriaFotografica`. Filtro deliberadamente
    // conservador: só publicado e nunca nível "administracao", mesmo para
    // quem vê o Diretório com sessão de Administrador — o Acervo VL6 é a
    // superfície certa para mídia restrita, não o perfil público.
    let memoriaFotografica: PublicMemberProfileDTO['memoriaFotografica'] = null;
    if (visibleSettings?.blocks.memoriaFotografica) {
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
        comissoes,
      },
      memoriaFotografica,
    });
  }
}
