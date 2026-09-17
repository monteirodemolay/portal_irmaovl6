import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ParamasonicEntityMember } from '../entities/paramasonic-entity-member.entity';
import type { IParamasonicEntityMemberRepository } from '../repositories/paramasonic-entity-member.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface ListParamasonicEntityMembersDeps {
  paramasonicEntityMemberRepository: IParamasonicEntityMemberRepository;
  memberRepository: IMemberRepository;
}

export interface ParamasonicEntityMemberDTO {
  id: string;
  memberId: string | null;
  nomeCompleto: string;
  contato: string | null;
  cargo: string | null;
  categoria: ParamasonicEntityMember['categoria'];
  situacao: ParamasonicEntityMember['situacao'];
  dataIngresso: Date | null;
}

/**
 * Lista os integrantes de uma entidade paramaçônica, resolvendo o nome do
 * Irmão cadastrado quando `memberId` está preenchido — mesmo padrão de
 * `ListParamasonicDirectoryUseCase`.
 */
export class ListParamasonicEntityMembersUseCase {
  constructor(private readonly deps: ListParamasonicEntityMembersDeps) {}

  async execute(ctx: AuthContext, entityId: string): Promise<ParamasonicEntityMemberDTO[]> {
    requirePermission(ctx, 'paramasonicEntity:read');

    const members = await this.deps.paramasonicEntityMemberRepository.listByEntity(
      ctx.tenantId,
      entityId,
    );
    if (members.length === 0) return [];

    const memberIds = [...new Set(members.filter((m) => m.memberId).map((m) => m.memberId!))];
    const resolvedMembers = await Promise.all(
      memberIds.map((id) => this.deps.memberRepository.findById(id)),
    );
    const memberById = new Map(
      resolvedMembers.filter((m): m is NonNullable<typeof m> => m !== null).map((m) => [m.id, m]),
    );

    const dtos: ParamasonicEntityMemberDTO[] = members.map((m) => ({
      id: m.id,
      memberId: m.memberId,
      nomeCompleto: m.memberId
        ? (memberById.get(m.memberId)?.nomeCompleto ?? '—')
        : (m.nomeCompleto ?? '—'),
      contato: m.contato,
      cargo: m.cargo,
      categoria: m.categoria,
      situacao: m.situacao,
      dataIngresso: m.dataIngresso,
    }));

    return dtos.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));
  }
}
