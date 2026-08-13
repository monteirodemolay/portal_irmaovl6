import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface CentralProfileAdminRow {
  memberId: string;
  nomeCompleto: string;
  profilePublished: boolean;
  suspendedAt: Date | null;
  suspendedReason: string | null;
}

export interface ListCentralProfilesAdminViewDeps {
  publicationSettingsRepository: IPublicationSettingsRepository;
  memberRepository: IMemberRepository;
}

/**
 * Visão administrativa de moderação (`/admin/pessoas/central`) — status de
 * publicação por Irmão, sem expor o conteúdo não publicado (só o
 * necessário pra decidir suspender/reativar). Só lista quem já tem
 * `PublicationSettings` (quem nunca abriu a Central nem aparece aqui —
 * não há nada pra moderar).
 */
export class ListCentralProfilesAdminViewUseCase {
  constructor(private readonly deps: ListCentralProfilesAdminViewDeps) {}

  async execute(ctx: AuthContext): Promise<Result<CentralProfileAdminRow[]>> {
    requirePermission(ctx, 'memberCentral:manage');

    const allSettings = await this.deps.publicationSettingsRepository.listByTenant(ctx.tenantId);
    const rows = await Promise.all(
      allSettings.map(async (settings) => {
        const member = await this.deps.memberRepository.findById(settings.memberId);
        return {
          memberId: settings.memberId,
          nomeCompleto: member?.nomeCompleto ?? '(Irmão removido)',
          profilePublished: settings.profilePublished,
          suspendedAt: settings.suspendedAt,
          suspendedReason: settings.suspendedReason,
        };
      }),
    );

    return ok(rows.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)));
  }
}
