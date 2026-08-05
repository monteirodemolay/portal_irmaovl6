import type { AuthContext } from '../../../shared/auth-context';
import { hasPermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { Committee } from '../entities/committee.entity';
import type { ICommitteeRepository } from '../repositories/committee.repository';

export interface UpdateCommitteeInput {
  nome: string;
  descricao: string | null;
  membrosIds: string[];
}

export interface UpdateCommitteeDeps {
  committeeRepository: ICommitteeRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
}

/**
 * "Permissões de escopo" (docs/architecture/10-roadmap.md, v1.2): quem tem
 * `committee:manage` edita qualquer comissão; um Irmão que já é membro da
 * própria comissão também pode editá-la (ex.: atualizar descrição, incluir/
 * remover colegas), sem precisar de uma permissão RBAC de escopo amplo —
 * mesmo espírito de `UpdateMyProfileUseCase`.
 */
export class UpdateCommitteeUseCase {
  constructor(private readonly deps: UpdateCommitteeDeps) {}

  async execute(
    ctx: AuthContext,
    committeeId: string,
    input: UpdateCommitteeInput,
  ): Promise<Result<Committee>> {
    const current = await this.deps.committeeRepository.findById(committeeId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Committee', committeeId));
    }

    if (!hasPermission(ctx, 'committee:manage')) {
      const member = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
      const isCommitteeMember = member !== null && current.membrosIds.includes(member.id);
      if (!isCommitteeMember) {
        return err(new ForbiddenError('committee:update'));
      }
    }

    const updated: Committee = {
      ...current,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.committeeRepository.update(updated);

    return ok(updated);
  }
}
