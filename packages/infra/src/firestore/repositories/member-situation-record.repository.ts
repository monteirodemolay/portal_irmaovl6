import type { Firestore } from 'firebase-admin/firestore';
import type { IMemberSituationRecordRepository, MemberSituationRecord } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'memberSituationHistory';
const DATE_FIELDS = ['dataInicio', 'dataFim', 'documentoData'] as const;

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
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByMemberId(memberId: string): Promise<MemberSituationRecord[]> {
    const snap = await this.collection.where('memberId', '==', memberId).get();
    return snap.docs.map((doc) => doc.data());
  }

  async findById(id: string): Promise<MemberSituationRecord | null> {
    const doc = await this.collection.doc(id).get();
    return doc.exists ? doc.data()! : null;
  }

  async create(record: MemberSituationRecord): Promise<void> {
    await this.collection.doc(record.id).set(record);
  }

  async update(record: MemberSituationRecord): Promise<void> {
    await this.collection.doc(record.id).set(record);
  }
}
