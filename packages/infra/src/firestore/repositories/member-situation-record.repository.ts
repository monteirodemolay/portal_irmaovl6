import type { Firestore } from 'firebase-admin/firestore';
import type { IMemberSituationRecordRepository, MemberSituationRecord } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'memberSituationHistory';
const DATE_FIELDS = ['dataInicio', 'dataFim', 'documentoData'] as const;

/**
 * Campos de proveniência GLEG foram adicionados depois de já existirem
 * registros gravados — documentos antigos não têm essas chaves no
 * Firestore. Sem normalizar aqui, todo registro pré-existente voltaria com
 * `undefined` (não `null`) nesses campos, quebrando qualquer checagem
 * `=== null` no domínio/UI. Único ponto de leitura, mesmo padrão de
 * `FirestoreMemberCentralProfileRepository.normalizeProfile`.
 */
function normalizeRecord(raw: MemberSituationRecord): MemberSituationRecord {
  return {
    ...raw,
    origem: raw.origem ?? null,
    sourceCode: raw.sourceCode ?? null,
    sourceLabel: raw.sourceLabel ?? null,
    recordKind: raw.recordKind ?? null,
    lojaOrigemId: raw.lojaOrigemId ?? null,
    lojaDestinoId: raw.lojaDestinoId ?? null,
    importBatchId: raw.importBatchId ?? null,
  };
}

export class FirestoreMemberSituationRecordRepository implements IMemberSituationRecordRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<MemberSituationRecord>(DATE_FIELDS));
  }

  async findVigenteByMemberId(memberId: string): Promise<MemberSituationRecord | null> {
    const snap = await this.collection
      .where('memberId', '==', memberId)
      .where('vigente', '==', true)
      .limit(1)
      .get();
    return snap.empty ? null : normalizeRecord(snap.docs[0]!.data());
  }

  async listByMemberId(memberId: string): Promise<MemberSituationRecord[]> {
    const snap = await this.collection.where('memberId', '==', memberId).get();
    return snap.docs.map((doc) => normalizeRecord(doc.data()));
  }

  async findById(id: string): Promise<MemberSituationRecord | null> {
    const doc = await this.collection.doc(id).get();
    return doc.exists ? normalizeRecord(doc.data()!) : null;
  }

  async create(record: MemberSituationRecord): Promise<void> {
    await this.collection.doc(record.id).set(record);
  }

  async update(record: MemberSituationRecord): Promise<void> {
    await this.collection.doc(record.id).set(record);
  }
}
