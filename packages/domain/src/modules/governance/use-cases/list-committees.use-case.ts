import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { Committee } from '../entities/committee.entity';
import type { ICommitteeRepository } from '../repositories/committee.repository';

export interface ListCommitteesDeps {
  committeeRepository: ICommitteeRepository;
}

/** Comissões de uma gestão — requer `committee:read`. */
export class ListCommitteesByGestaoUseCase {
  constructor(private readonly deps: ListCommitteesDeps) {}

  async execute(ctx: AuthContext, gestaoId: string): Promise<Committee[]> {
    requirePermission(ctx, 'committee:read');
    return this.deps.committeeRepository.listByGestao(gestaoId);
  }
}

export interface ListMyCommitteesDeps {
  committeeRepository: ICommitteeRepository;
  memberRepository: IMemberRepository;
}

/** Comissões das quais o próprio Irmão faz parte — ação pessoal, sem `requirePermission`. */
export class ListMyCommitteesUseCase {
  constructor(private readonly deps: ListMyCommitteesDeps) {}

  async execute(ctx: AuthContext): Promise<Committee[]> {
    const member = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!member) return [];
    return this.deps.committeeRepository.listByMemberId(ctx.tenantId, member.id);
  }
}
