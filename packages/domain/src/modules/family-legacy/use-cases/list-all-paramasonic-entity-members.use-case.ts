import type {
  FraternalAffiliationKind,
  ParamasonicEntityMemberCategory,
  ParamasonicEntityMemberSituation,
} from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IParamasonicEntityMemberRepository } from '../repositories/paramasonic-entity-member.repository';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface ListAllParamasonicEntityMembersDeps {
  paramasonicEntityMemberRepository: IParamasonicEntityMemberRepository;
  paramasonicEntityRepository: IParamasonicEntityRepository;
  memberRepository: IMemberRepository;
}

export interface AllParamasonicEntityMembersEntryDTO {
  id: string;
  entityId: string;
  entityKind: Exclude<FraternalAffiliationKind, 'mason'>;
  entityName: string;
  entityShortName: string;
  nomeCompleto: string;
  memberId: string | null;
  cargo: string | null;
  categoria: ParamasonicEntityMemberCategory | null;
  situacao: ParamasonicEntityMemberSituation;
}

/**
 * Lista os integrantes de TODAS as entidades paramaçônicas do tenant, com o
 * nome da entidade já anexado — base da seção "Membros das Entidades
 * Paramaçônicas" na Comunidade Paramaçônica (`/paramaconicas`), que mostra
 * todo mundo segmentado por categoria e filtrável por entidade, em vez de
 * exigir entrar entidade por entidade.
 */
export class ListAllParamasonicEntityMembersUseCase {
  constructor(private readonly deps: ListAllParamasonicEntityMembersDeps) {}

  async execute(ctx: AuthContext): Promise<AllParamasonicEntityMembersEntryDTO[]> {
    requirePermission(ctx, 'paramasonicEntity:read');

    const entities = await this.deps.paramasonicEntityRepository.listByTenant(ctx.tenantId);
    if (entities.length === 0) return [];

    const membersByEntity = await Promise.all(
      entities.map((entity) =>
        this.deps.paramasonicEntityMemberRepository.listByEntity(ctx.tenantId, entity.id),
      ),
    );

    const allMemberIds = [
      ...new Set(
        membersByEntity.flatMap((members) =>
          members.filter((m) => m.memberId).map((m) => m.memberId!),
        ),
      ),
    ];
    const resolvedMembers = await Promise.all(
      allMemberIds.map((id) => this.deps.memberRepository.findById(id)),
    );
    const memberById = new Map(
      resolvedMembers.filter((m): m is NonNullable<typeof m> => m !== null).map((m) => [m.id, m]),
    );

    const entries: AllParamasonicEntityMembersEntryDTO[] = [];
    entities.forEach((entity, index) => {
      for (const member of membersByEntity[index]!) {
        entries.push({
          id: member.id,
          entityId: entity.id,
          entityKind: entity.kind,
          entityName: entity.name,
          entityShortName: entity.shortName,
          nomeCompleto: member.memberId
            ? (memberById.get(member.memberId)?.nomeCompleto ?? '—')
            : (member.nomeCompleto ?? '—'),
          memberId: member.memberId,
          cargo: member.cargo,
          categoria: member.categoria,
          situacao: member.situacao,
        });
      }
    });

    return entries.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));
  }
}
