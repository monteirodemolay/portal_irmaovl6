import type { MemberSituationRecord } from '../entities/member-situation-record.entity';

export interface IMemberSituationRecordRepository {
  /** No máximo 1 resultado por Irmão — regra de integridade garantida por `RegisterMemberSituationUseCase`. */
  findVigenteByMemberId(memberId: string): Promise<MemberSituationRecord | null>;
  /** Ordem cronológica crescente por `dataInicio` — quem consome inverte pra exibir mais recente primeiro. */
  listByMemberId(memberId: string): Promise<MemberSituationRecord[]>;
  findById(id: string): Promise<MemberSituationRecord | null>;
  create(record: MemberSituationRecord): Promise<void>;
  update(record: MemberSituationRecord): Promise<void>;
}
