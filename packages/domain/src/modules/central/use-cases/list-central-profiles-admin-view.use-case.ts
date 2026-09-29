import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import { resolveEffectivePublication } from '../lib/resolve-effective-publication';

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
 * necessário pra decidir suspender/reativar).
 *
 * Lista TODO Irmão não excluído (não só quem já tem `PublicationSettings`)
 * — desde a publicação-por-padrão (setembro/2026), quem nunca abriu a
 * Central também está com o perfil aberto (`resolveEffectivePublication`),
 * então também precisa poder ser encontrado/suspenso aqui, não só quem já
 * mexeu em alguma configuração.
 */
export class ListCentralProfilesAdminViewUseCase {
  constructor(private readonly deps: ListCentralProfilesAdminViewDeps) {}

  async execute(ctx: AuthContext): Promise<Result<CentralProfileAdminRow[]>> {
    requirePermission(ctx, 'memberCentral:manage');

    const [members, allSettings] = await Promise.all([
      this.fetchAllMembers(ctx.tenantId),
      this.deps.publicationSettingsRepository.listByTenant(ctx.tenantId),
    ]);
    const settingsByMember = new Map(allSettings.map((s) => [s.memberId, s]));

    const rows = members
      .filter((member) => member.deletedAt === null)
      .map((member) => {
        const settings = settingsByMember.get(member.id) ?? null;
        const effective = resolveEffectivePublication(settings);
        return {
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          profilePublished: effective.open,
          suspendedAt: settings?.suspendedAt ?? null,
          suspendedReason: settings?.suspendedReason ?? null,
        };
      });

    return ok(rows.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)));
  }

  /** Busca o tenant inteiro em páginas — mesmo padrão de `SearchDirectoryUseCase`. */
  private async fetchAllMembers(tenantId: string) {
    const all = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const result = await this.deps.memberRepository.search({ tenantId }, { limit: 500, cursor });
      all.push(...result.items);
      if (!result.hasMore || !result.nextCursor) break;
      cursor = result.nextCursor;
    }
    return all;
  }
}
