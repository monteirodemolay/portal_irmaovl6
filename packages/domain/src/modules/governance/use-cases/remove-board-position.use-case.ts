import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { IMemberTitleRepository } from '../../honors/repositories/member-title.repository';
import { grantMestreInstaladoTitleIfNeeded } from '../../honors/lib/grant-mestre-instalado-title';
import type { IBoardPositionAssignmentRepository } from '../repositories/board-position-assignment.repository';

export interface RemoveBoardPositionInput {
  assignmentId: string;
}

export interface RemoveBoardPositionDeps {
  assignmentRepository: IBoardPositionAssignmentRepository;
  memberRepository: IMemberRepository;
  positionHistoryRepository: IMemberPositionHistoryRepository;
  memberTitleRepository: IMemberTitleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Remove um Irmão de um cargo da Diretoria sem colocar outro no lugar —
 * complementa `AssignBoardPositionUseCase` (que só TROCA quem ocupa um
 * cargo de ocorrência única, nunca esvazia) e é o único jeito de tirar uma
 * ocorrência de cargo múltiplo (Diácono/Experto) sem duplicar, ou de
 * desfazer uma atribuição feita por engano. Mesmo encerramento de
 * histórico/título de `AssignBoardPositionUseCase` ao trocar alguém de
 * cargo — Venerável Mestre removido ganha "Mestre Instalado"
 * automaticamente, igual a quando é substituído por outro titular.
 */
export class RemoveBoardPositionUseCase {
  constructor(private readonly deps: RemoveBoardPositionDeps) {}

  async execute(ctx: AuthContext, input: RemoveBoardPositionInput): Promise<Result<void>> {
    requirePermission(ctx, 'boardTerm:manage');

    const assignment = await this.deps.assignmentRepository.findById(input.assignmentId);
    if (!assignment || assignment.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('BoardPositionAssignment', input.assignmentId));
    }

    const now = this.deps.clock.now();

    const active = await this.deps.positionHistoryRepository.findActiveByMemberId(
      assignment.memberId,
    );
    if (active && active.gestaoId === assignment.gestaoId && active.cargo === assignment.cargo) {
      await this.deps.positionHistoryRepository.update({
        ...active,
        dataFim: now,
        updatedAt: now,
        updatedBy: ctx.uid,
      });

      if (assignment.cargo === 'veneravel_mestre') {
        await grantMestreInstaladoTitleIfNeeded(this.deps, {
          tenantId: ctx.tenantId,
          memberId: assignment.memberId,
          dataFimCargo: now,
          uid: ctx.uid,
          fundamento: 'Concedido automaticamente ao encerrar o cargo de Venerável Mestre.',
        });
      }
    }

    const member = await this.deps.memberRepository.findById(assignment.memberId);
    if (member?.cargoAtualId === assignment.id) {
      await this.deps.memberRepository.update({
        ...member,
        cargoAtualId: null,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }

    await this.deps.assignmentRepository.delete(assignment.id);

    return ok(undefined);
  }
}
