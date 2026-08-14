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

export interface GetPublicMemberProfileDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  publicationSettingsRepository: IPublicationSettingsRepository;
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
    return ok(buildPublicMemberProfileDTO(member, profile, settings));
  }
}
