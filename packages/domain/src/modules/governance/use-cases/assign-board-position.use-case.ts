import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { MemberPositionHistory } from '../../membership/entities/member-position-history.entity';
import type { IMemberTitleRepository } from '../../honors/repositories/member-title.repository';
import { grantMestreInstaladoTitleIfNeeded } from '../../honors/lib/grant-mestre-instalado-title';
import type { BoardPositionAssignment } from '../entities/board-position-assignment.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';
import type { IBoardPositionAssignmentRepository } from '../repositories/board-position-assignment.repository';

export interface AssignBoardPositionInput {
  gestaoId: string;
  /** Chave de `BOARD_POSITION_KEYS` ou um cargo extra digitado pelo usuário. */
  cargo: string;
  memberId: string;
  ordem: number;
}

export interface AssignBoardPositionDeps {
  boardTermRepository: IBoardTermRepository;
  assignmentRepository: IBoardPositionAssignmentRepository;
  memberRepository: IMemberRepository;
  positionHistoryRepository: IMemberPositionHistoryRepository;
  memberTitleRepository: IMemberTitleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Atribui um Irmão a um cargo da Diretoria dentro de uma gestão. `cargo`
 * aceita tanto uma chave de BOARD_POSITION_KEYS quanto um cargo extra
 * digitado pelo usuário (ex.: novos cargos de oficiais). Para cargos de
 * ocorrência única (todos exceto Diácono/Experto), substitui quem estava no cargo,
 * encerrando o histórico do titular anterior. Sempre grava uma entrada em
 * `memberPositionHistory` e atualiza `Member.cargoAtualId` do novo titular
 * — docs/architecture/06-regras-negocio.md §6.2.
 *
 * O período gravado no histórico é o da própria Gestão
 * (`term.periodoInicio`/`term.periodoFim`), nunca o momento em que o
 * Administrador clicou em "Atribuir" no Portal (que normalmente acontece
 * dias ou semanas depois da posse de verdade, e nunca deveria aparecer
 * como a data de início do cargo). A única exceção é uma substituição no
 * meio do mandato (Irmão diferente assumindo por afastamento, renúncia ou
 * falecimento) — aí sim o início do novo titular é o momento real da
 * troca (`clock.now()`).
 */
export class AssignBoardPositionUseCase {
  constructor(private readonly deps: AssignBoardPositionDeps) {}

  async execute(
    ctx: AuthContext,
    input: AssignBoardPositionInput,
  ): Promise<Result<BoardPositionAssignment>> {
    requirePermission(ctx, 'boardTerm:manage');

    const [term, member] = await Promise.all([
      this.deps.boardTermRepository.findById(input.gestaoId),
      this.deps.memberRepository.findById(input.memberId),
    ]);
    if (!term || term.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('BoardTerm', input.gestaoId));
    }
    if (!member || member.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', input.memberId));
    }

    const now = this.deps.clock.now();
    const isSingleOccurrence = input.cargo !== 'diacono' && input.cargo !== 'experto';

    let assignment: BoardPositionAssignment;
    // Mesmo Irmão já ocupando este cargo nesta Gestão, reatribuído de novo
    // (reenvio do formulário, correção de `ordem` etc.) — nada realmente
    // mudou de titular, então não é um novo capítulo da trajetória dele.
    let isSameHolderReassignment = false;
    // Um Irmão DIFERENTE assumindo no meio do mandato (afastamento,
    // renúncia, falecimento) — evento real acontecendo agora, diferente do
    // caso comum de "atribuir no começo da Gestão".
    let isMidTermSubstitution = false;

    if (isSingleOccurrence) {
      const existing = await this.deps.assignmentRepository.findByGestaoAndCargo(
        input.gestaoId,
        input.cargo,
      );
      if (existing && existing.memberId !== input.memberId) {
        isMidTermSubstitution = true;
        await this.closeActivePosition(existing.memberId, ctx);
      }
      if (existing) {
        isSameHolderReassignment = existing.memberId === input.memberId;
        assignment = { ...existing, memberId: input.memberId, updatedAt: now, updatedBy: ctx.uid };
        await this.deps.assignmentRepository.update(assignment);
      } else {
        assignment = this.newAssignment(ctx, input, now);
        await this.deps.assignmentRepository.create(assignment);
      }
    } else {
      assignment = this.newAssignment(ctx, input, now);
      await this.deps.assignmentRepository.create(assignment);
    }

    // Só abre um novo capítulo do histórico quando o titular de fato mudou
    // (ou é a primeira vez que alguém ocupa este cargo nesta Gestão) — sem
    // esta checagem, reatribuir o MESMO Irmão ao MESMO cargo/Gestão criava
    // um segundo registro de histórico duplicado, fragmentando o período
    // real em dois pedaços (o que aparecia como "Venerável Mestre"
    // repetido duas vezes no card "Registros maçônicos" do Perfil).
    if (!isSameHolderReassignment) {
      // Um Irmão é titular de um cargo durante TODA a Gestão em que está
      // inserido — o período real é o da própria Gestão, nunca o
      // momento em que o Administrador clicou em "Atribuir" no Portal
      // (que pode acontecer dias/semanas depois da posse de verdade).
      // Só numa substituição no meio do mandato o início realmente é
      // "agora" — a pessoa nova não estava no cargo desde o começo da
      // Gestão. `dataFim` só é preenchida quando a própria Gestão já
      // terminou (Gestão futura/em curso fica "em curso", nunca com uma
      // data de término inventada).
      const dataInicio = isMidTermSubstitution ? now : term.periodoInicio;
      const dataFim = term.periodoFim <= now ? term.periodoFim : null;

      const historyEntry: MemberPositionHistory = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        memberId: input.memberId,
        cargo: input.cargo,
        gestaoId: input.gestaoId,
        dataInicio,
        dataFim,
        observacoes: null,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.uid,
        updatedBy: ctx.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      };
      await this.deps.positionHistoryRepository.create(historyEntry);
    }

    await this.deps.memberRepository.update({
      ...member,
      cargoAtualId: assignment.id,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    return ok(assignment);
  }

  private newAssignment(
    ctx: AuthContext,
    input: AssignBoardPositionInput,
    now: Date,
  ): BoardPositionAssignment {
    return {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      gestaoId: input.gestaoId,
      cargo: input.cargo,
      memberId: input.memberId,
      ordem: input.ordem,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
  }

  private async closeActivePosition(memberId: string, ctx: AuthContext): Promise<void> {
    const active = await this.deps.positionHistoryRepository.findActiveByMemberId(memberId);
    if (!active) return;

    const now = this.deps.clock.now();
    await this.deps.positionHistoryRepository.update({
      ...active,
      dataFim: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    if (active.cargo === 'veneravel_mestre') {
      await grantMestreInstaladoTitleIfNeeded(this.deps, {
        tenantId: ctx.tenantId,
        memberId,
        dataFimCargo: now,
        uid: ctx.uid,
        fundamento: 'Concedido automaticamente ao encerrar o cargo de Venerável Mestre.',
      });
    }

    const previousMember = await this.deps.memberRepository.findById(memberId);
    if (previousMember?.cargoAtualId) {
      await this.deps.memberRepository.update({
        ...previousMember,
        cargoAtualId: null,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }
  }
}
