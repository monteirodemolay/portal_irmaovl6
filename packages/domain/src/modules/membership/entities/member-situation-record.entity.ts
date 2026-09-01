import type { MemberSituationStatus } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface MemberSituationAttachment {
  nome: string;
  url: string;
}

/**
 * Um registro na linha do tempo da Situação Maçônica de um Irmão. Nunca é
 * apagado — mudar a situação sempre encerra o registro vigente (`dataFim`
 * preenchida, `vigente: false`) e cria um novo, preservando o anterior
 * integralmente (docs pedidos pelo Administrador: Quite-Placet nunca some
 * do histórico mesmo depois do Irmão retornar). `Member.situacao` é sempre
 * um espelho do registro com `vigente: true` deste Irmão — nunca a fonte
 * de verdade.
 */
export interface MemberSituationRecord extends BaseEntity {
  memberId: string;
  situacao: MemberSituationStatus;
  /** Chave de `MEMBER_SITUATION_REASONS[situacao]`. */
  motivo: string;
  /** Obrigatório quando `motivo === 'outro'`. */
  motivoOutroDescricao: string | null;
  dataInicio: Date;
  /** `null` enquanto `vigente === true`. */
  dataFim: Date | null;
  lojaId: string | null;
  potencia: string | null;
  documentoNumero: string | null;
  documentoData: Date | null;
  observacoes: string | null;
  anexos: MemberSituationAttachment[];
  /** Só um registro por Irmão tem `vigente: true` — ver regra de integridade em `RegisterMemberSituationUseCase`. */
  vigente: boolean;
  /**
   * `true` quando `dataInicio` não pôde ser apurada com certeza — gerado
   * pela migração automática (`SeedMemberSituationHistoryUseCase`) a
   * partir do cadastro antigo, nunca por lançamento manual. Sinaliza pro
   * Admin que aquele registro está na lista de revisão manual.
   */
  dataInicioEstimada: boolean;
  /** Preenchida só quando este registro é uma correção retroativa de um registro já existente (ver `EditMemberSituationRecordUseCase`). */
  justificativaEdicaoRetroativa: string | null;
}
