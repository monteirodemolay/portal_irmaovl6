import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { BusinessSubmissionAdminViewDTO } from '../dtos/business-submission-admin-view.dto';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface ListBusinessSubmissionsDeps {
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  memberRepository: IMemberRepository;
}

/**
 * Fila de moderação de "Negócios & Serviços" — varre TODO perfil da
 * Central do tenant (`listByTenant`, não `listPublishedByTenant`: um
 * negócio pode estar em revisão mesmo que o Irmão nunca tenha publicado o
 * restante do perfil) e achata só as entradas `pending_review`. Nunca lê o
 * DTO público (`buildPublicMemberProfileDTO`) — a Administração precisa
 * enxergar exatamente o que está pendente, sem o filtro de privacidade do
 * Diretório.
 */
export class ListBusinessSubmissionsUseCase {
  constructor(private readonly deps: ListBusinessSubmissionsDeps) {}

  async execute(ctx: AuthContext): Promise<Result<BusinessSubmissionAdminViewDTO[]>> {
    requirePermission(ctx, 'memberCentral:manage');

    const profiles = await this.deps.memberCentralProfileRepository.listByTenant(ctx.tenantId);
    const pendingByProfile = profiles.filter((profile) =>
      profile.negocios.some((n) => n.status === 'pending_review'),
    );

    const members = await Promise.all(
      pendingByProfile.map((profile) => this.deps.memberRepository.findById(profile.memberId)),
    );

    const rows: BusinessSubmissionAdminViewDTO[] = [];
    pendingByProfile.forEach((profile, index) => {
      const member = members[index];
      if (!member) return;
      for (const negocio of profile.negocios) {
        if (negocio.status !== 'pending_review') continue;
        rows.push({
          memberId: profile.memberId,
          memberNomeCompleto: member.nomeCompleto,
          businessId: negocio.id,
          nomeEmpresa: negocio.nomeEmpresa,
          segmento: negocio.segmento,
          cidade: negocio.cidade,
          descricao: negocio.descricao,
          logoUrl: negocio.logoUrl,
          whatsappComercial: negocio.whatsappComercial,
          emailComercial: negocio.emailComercial,
          status: negocio.status,
          updatedAt: negocio.updatedAt,
        });
      }
    });

    rows.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    return ok(rows);
  }
}
