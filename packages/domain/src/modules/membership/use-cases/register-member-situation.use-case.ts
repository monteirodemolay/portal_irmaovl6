import {
  MEMBER_SITUATION_REASONS,
  TERMINAL_MEMBER_SITUATION_STATUSES,
  type MemberSituationStatus,
} from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ok,
  err,
  type Result,
} from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type {
  MemberSituationAttachment,
  MemberSituationRecord,
} from '../entities/member-situation-record.entity';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IMemberSituationRecordRepository } from '../repositories/member-situation-record.repository';
import type { IMemberPositionHistoryRepository } from '../repositories/member-position-history.repository';

export interface RegisterMemberSituationDeps {
  memberRepository: IMemberRepository;
  situationRecordRepository: IMemberSituationRecordRepository;
  positionHistoryRepository: IMemberPositionHistoryRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface RegisterMemberSituationInput {
  situacao: MemberSituationStatus;
  motivo: string;
  motivoOutroDescricao?: string | null;
  dataInicio: Date;
  lojaId?: string | null;
  potencia?: string | null;
  documentoNumero?: string | null;
  documentoData?: Date | null;
  observacoes?: string | null;
  anexos?: MemberSituationAttachment[];
}

export interface RegisterMemberSituationOutput {
  member: Member;
  record: MemberSituationRecord;
}

/**
 * Único ponto de escrita da Situação Maçônica — cobre "Alterar situação",
 * "Registrar licença" e "Registrar retorno" da UI (todos a mesma operação
 * de domínio: encerrar o registro vigente e abrir um novo; só o motivo
 * sugerido varia por tela). Nunca apaga o registro anterior — a regra de
 * negócio do Administrador é literal: um Quite-Placet precisa sobreviver a
 * um retorno posterior do Irmão.
 */
export class RegisterMemberSituationUseCase {
  constructor(private readonly deps: RegisterMemberSituationDeps) {}

  async execute(
    ctx: AuthContext,
    memberId: string,
    input: RegisterMemberSituationInput,
  ): Promise<Result<RegisterMemberSituationOutput>> {
    requirePermission(ctx, 'member:update');

    const member = await this.deps.memberRepository.findById(memberId);
    if (!member || member.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', memberId));
    }

    const motivosValidos: readonly string[] = MEMBER_SITUATION_REASONS[input.situacao];
    if (!motivosValidos.includes(input.motivo)) {
      return err(
        new ValidationError(
          `Motivo "${input.motivo}" inválido para a situação "${input.situacao}".`,
        ),
      );
    }
    if (input.motivo === 'outro' && !input.motivoOutroDescricao?.trim()) {
      return err(new ValidationError('Descrição obrigatória quando o motivo é "Outro".'));
    }

    const now = this.deps.clock.now();
    const vigente = await this.deps.situationRecordRepository.findVigenteByMemberId(memberId);

    if (vigente && input.dataInicio.getTime() < vigente.dataInicio.getTime()) {
      return err(
        new ConflictError(
          'A data de início não pode ser anterior à situação vigente. Para corrigir um registro já existente, use a edição retroativa.',
        ),
      );
    }

    if (vigente) {
      await this.deps.situationRecordRepository.update({
        ...vigente,
        dataFim: input.dataInicio,
        vigente: false,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }

    const record: MemberSituationRecord = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId,
      situacao: input.situacao,
      motivo: input.motivo,
      motivoOutroDescricao:
        input.motivo === 'outro' ? (input.motivoOutroDescricao?.trim() ?? null) : null,
      dataInicio: input.dataInicio,
      dataFim: null,
      lojaId: input.lojaId ?? member.lojaId,
      potencia: input.potencia ?? member.potencia,
      documentoNumero: input.documentoNumero ?? null,
      documentoData: input.documentoData ?? null,
      observacoes: input.observacoes ?? null,
      anexos: input.anexos ?? [],
      vigente: true,
      dataInicioEstimada: false,
      justificativaEdicaoRetroativa: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.situationRecordRepository.create(record);

    const isTerminal = TERMINAL_MEMBER_SITUATION_STATUSES.includes(input.situacao);
    if (isTerminal) {
      const activePosition =
        await this.deps.positionHistoryRepository.findActiveByMemberId(memberId);
      if (activePosition) {
        await this.deps.positionHistoryRepository.update({
          ...activePosition,
          dataFim: now,
          updatedAt: now,
          updatedBy: ctx.uid,
        });
      }
    }

    const updatedMember: Member = {
      ...member,
      situacao: input.situacao,
      cargoAtualId: isTerminal ? null : member.cargoAtualId,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.memberRepository.update(updatedMember);

    return ok({ member: updatedMember, record });
  }
}
