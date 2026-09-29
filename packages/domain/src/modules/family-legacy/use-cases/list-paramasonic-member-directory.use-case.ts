import { getBoardPositionLabel } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberCentralProfileRepository } from '../../central/repositories/member-central-profile.repository';
import type { IPublicationSettingsRepository } from '../../central/repositories/publication-settings.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { IBoardPositionAssignmentRepository } from '../../governance/repositories/board-position-assignment.repository';
import { resolveAreaAtuacao } from '../../central/lib/resolve-area-atuacao';
import { resolveEffectivePublication } from '../../central/lib/resolve-effective-publication';
import type { ParamasonicMemberDirectoryDTO } from '../dtos/paramasonic-member-directory.dto';

export interface ListParamasonicMemberDirectoryDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  publicationSettingsRepository: IPublicationSettingsRepository;
  boardTermRepository: IBoardTermRepository;
  boardPositionAssignmentRepository: IBoardPositionAssignmentRepository;
}

const PAGE_LIMIT = 500;
const MAX_PAGES = 10;

/**
 * Diretório reduzido disponibilizado às organizações paramaçônicas.
 * A autorização é própria e nunca equivale a `memberDirectory:read`.
 */
export class ListParamasonicMemberDirectoryUseCase {
  constructor(private readonly deps: ListParamasonicMemberDirectoryDeps) {}

  async execute(ctx: AuthContext): Promise<ParamasonicMemberDirectoryDTO[]> {
    requirePermission(ctx, 'paramasonicCommunity:read');

    const [members, profiles, settings, activeTerm] = await Promise.all([
      this.fetchAllMembers(ctx.tenantId),
      this.deps.memberCentralProfileRepository.listByTenant(ctx.tenantId),
      this.deps.publicationSettingsRepository.listByTenant(ctx.tenantId),
      this.deps.boardTermRepository.findActive(ctx.tenantId),
    ]);
    const assignments = activeTerm
      ? await this.deps.boardPositionAssignmentRepository.listByGestao(activeTerm.id)
      : [];
    const cargoByMember = new Map(
      assignments.map((assignment) => [
        assignment.memberId,
        getBoardPositionLabel(assignment.cargo),
      ]),
    );
    const profileByMember = new Map(profiles.map((profile) => [profile.memberId, profile]));
    const settingsByMember = new Map(settings.map((entry) => [entry.memberId, entry]));

    return members
      .filter(
        (member) =>
          member.tenantId === ctx.tenantId &&
          member.deletedAt === null &&
          member.situacao === 'ativo',
      )
      .map((member) => {
        const profile = profileByMember.get(member.id) ?? null;
        const publication = settingsByMember.get(member.id) ?? null;
        const effective = resolveEffectivePublication(publication);
        const blocks = effective.open ? effective.blocks : null;
        const area = blocks?.profissional ? resolveAreaAtuacao(profile) : null;

        return {
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          fotoUrl: member.fotoUrl,
          cargoAtual: cargoByMember.get(member.id) ?? null,
          apresentacao: blocks?.apresentacao ? (profile?.apresentacao ?? null) : null,
          profissao: blocks?.profissional ? member.profissao : null,
          areaAtuacao: area?.label ?? null,
          cidadeExibicao: blocks?.informacoesPessoais ? (profile?.cidadeExibicao ?? null) : null,
        } satisfies ParamasonicMemberDirectoryDTO;
      })
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));
  }

  private async fetchAllMembers(tenantId: string) {
    const members = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await this.deps.memberRepository.search(
        { tenantId },
        { limit: PAGE_LIMIT, cursor },
      );
      members.push(...result.items);
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
    return members;
  }
}
