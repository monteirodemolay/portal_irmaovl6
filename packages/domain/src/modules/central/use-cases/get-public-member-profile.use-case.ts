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

export interface GetPublicMemberProfileDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  publicationSettingsRepository: IPublicationSettingsRepository;
  memberPositionHistoryRepository: IMemberPositionHistoryRepository;
  boardTermRepository: IBoardTermRepository;
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
    const history = await this.deps.memberPositionHistoryRepository.listByMemberId(targetMemberId);
    const gestaoIds = [...new Set(history.map((entry) => entry.gestaoId))];
    const terms = await Promise.all(
      gestaoIds.map((gestaoId) => this.deps.boardTermRepository.findById(gestaoId)),
    );
    const termNameById = new Map(
      terms.filter((term) => term !== null).map((term) => [term.id, term.nome]),
    );
    const cargos = [...history]
      .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime())
      .map((entry) => ({
        cargo: entry.cargo,
        gestaoNome: termNameById.get(entry.gestaoId) ?? 'Gestão',
        dataInicio: entry.dataInicio,
        dataFim: entry.dataFim,
      }));

    return ok({
      ...dto,
      trajetoria: {
        dataIniciacao: member.dataIniciacao,
        dataElevacao: member.dataElevacao,
        dataExaltacao: member.dataExaltacao,
        cargos,
      },
    });
  }
}
