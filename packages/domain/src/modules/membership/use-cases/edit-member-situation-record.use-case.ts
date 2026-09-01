import { MEMBER_SITUATION_REASONS } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ok,
  err,
  type Result,
} from '../../../shared/result';
import type {
  MemberSituationAttachment,
  MemberSituationRecord,
} from '../entities/member-situation-record.entity';
import type { IMemberSituationRecordRepository } from '../repositories/member-situation-record.repository';

export interface EditMemberSituationRecordDeps {
  situationRecordRepository: IMemberSituationRecordRepository;
  clock: IClock;
}

export interface EditMemberSituationRecordInput {
  motivo?: string;
  motivoOutroDescricao?: string | null;
  dataInicio?: Date;
  lojaId?: string | null;
  potencia?: string | null;
  documentoNumero?: string | null;
  documentoData?: Date | null;
  observacoes?: string | null;
  anexos?: MemberSituationAttachment[];
  /** Sempre obrigatória — esta é a única porta pra corrigir um registro já lançado. */
  justificativa: string;
}

/**
 * Correção de um registro do histórico já lançado — nunca cria/apaga
 * registro nenhum, só ajusta o registro existente (motivo, documento,
 * anexos, observações, ou a própria `dataInicio`). Regra de integridade
 * (docs pedidos pelo Administrador, §8): mudar `dataInicio` de um registro
 * no meio da linha do tempo precisa recalcular a `dataFim` do registro
 * imediatamente anterior, pra nunca deixar um "buraco" ou sobreposição.
 */
export class EditMemberSituationRecordUseCase {
  constructor(private readonly deps: EditMemberSituationRecordDeps) {}

  async execute(
    ctx: AuthContext,
    recordId: string,
    input: EditMemberSituationRecordInput,
  ): Promise<Result<MemberSituationRecord>> {
    requirePermission(ctx, 'member:update');

    if (!input.justificativa?.trim()) {
      return err(
        new ValidationError('Justificativa obrigatória para editar um registro do histórico.'),
      );
    }

    const record = await this.deps.situationRecordRepository.findById(recordId);
    if (!record || record.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('MemberSituationRecord', recordId));
    }

    const situacaoAlvo = record.situacao;
    if (input.motivo !== undefined) {
      const motivosValidos: readonly string[] = MEMBER_SITUATION_REASONS[situacaoAlvo];
      if (!motivosValidos.includes(input.motivo)) {
        return err(
          new ValidationError(
            `Motivo "${input.motivo}" inválido para a situação "${situacaoAlvo}".`,
          ),
        );
      }
      if (input.motivo === 'outro' && !input.motivoOutroDescricao?.trim()) {
        return err(new ValidationError('Descrição obrigatória quando o motivo é "Outro".'));
      }
    }

    const now = this.deps.clock.now();
    let updatedPrevious: MemberSituationRecord | null = null;

    if (input.dataInicio && input.dataInicio.getTime() !== record.dataInicio.getTime()) {
      const irmaosRecords = await this.deps.situationRecordRepository.listByMemberId(
        record.memberId,
      );
      const ordenados = [...irmaosRecords].sort(
        (a, b) => a.dataInicio.getTime() - b.dataInicio.getTime(),
      );
      const index = ordenados.findIndex((r) => r.id === record.id);
      const anterior = index > 0 ? ordenados[index - 1]! : null;
      const proximo = index < ordenados.length - 1 ? ordenados[index + 1]! : null;

      if (anterior && input.dataInicio.getTime() < anterior.dataInicio.getTime()) {
        return err(
          new ConflictError(
            'A nova data de início não pode anteceder o registro anterior na linha do tempo.',
          ),
        );
      }
      if (proximo && input.dataInicio.getTime() >= proximo.dataInicio.getTime()) {
        return err(
          new ConflictError(
            'A nova data de início não pode alcançar ou passar o próximo registro na linha do tempo.',
          ),
        );
      }

      if (anterior) {
        updatedPrevious = {
          ...anterior,
          dataFim: input.dataInicio,
          updatedAt: now,
          updatedBy: ctx.uid,
        };
        await this.deps.situationRecordRepository.update(updatedPrevious);
      }
    }

    const updated: MemberSituationRecord = {
      ...record,
      motivo: input.motivo ?? record.motivo,
      motivoOutroDescricao:
        input.motivo === undefined
          ? record.motivoOutroDescricao
          : input.motivo === 'outro'
            ? (input.motivoOutroDescricao?.trim() ?? null)
            : null,
      dataInicio: input.dataInicio ?? record.dataInicio,
      lojaId: input.lojaId !== undefined ? input.lojaId : record.lojaId,
      potencia: input.potencia !== undefined ? input.potencia : record.potencia,
      documentoNumero:
        input.documentoNumero !== undefined ? input.documentoNumero : record.documentoNumero,
      documentoData: input.documentoData !== undefined ? input.documentoData : record.documentoData,
      observacoes: input.observacoes !== undefined ? input.observacoes : record.observacoes,
      anexos: input.anexos ?? record.anexos,
      dataInicioEstimada: input.dataInicio ? false : record.dataInicioEstimada,
      justificativaEdicaoRetroativa: input.justificativa.trim(),
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.situationRecordRepository.update(updated);

    return ok(updated);
  }
}
