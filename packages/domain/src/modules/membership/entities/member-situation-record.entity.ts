import type {
  MemberSituationStatus,
  MemberStatusRecordKind,
  MemberStatusRecordOrigin,
} from '@vl6/shared';
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

  /**
   * Campos de proveniência GLEG — todos opcionais/nulos, adicionados sem
   * quebrar nenhum registro/fluxo existente. `null` em todos é o estado de
   * todo registro lançado localmente antes desta feature existir (e
   * continua sendo o estado padrão de "Alterar situação"/"Registrar
   * licença"/"Registrar retorno" quando o Administrador não marca a origem
   * como GLEG) — ver `RegisterMemberSituationUseCase`.
   */
  /** `null` = registro local, sem proveniência externa explícita. */
  origem: MemberStatusRecordOrigin | null;
  /** Código original recebido da GLEG, se houver (ex.: código de um relatório de importação). */
  sourceCode: string | null;
  /**
   * Rótulo original EXATO como recebido/lançado (ex.: "Quite-Placet",
   * "Placet ex officio ..."). Nunca reescrito/normalizado por código —
   * sempre texto digitado por um humano a partir de um documento real.
   */
  sourceLabel: string | null;
  /**
   * Natureza do ato/ocorrência — metadado independente de `situacao`, nunca
   * a substitui nem a deriva automaticamente (ver `MemberStatusRecordKind`).
   */
  recordKind: MemberStatusRecordKind | null;
  lojaOrigemId: string | null;
  lojaDestinoId: string | null;
  /** Referência ao lote de importação, quando o registro veio de um arquivo (mecanismo de importação ainda não construído nesta fase). */
  importBatchId: string | null;
}
