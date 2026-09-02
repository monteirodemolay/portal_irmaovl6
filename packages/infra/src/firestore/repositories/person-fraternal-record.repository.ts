import type { Firestore } from 'firebase-admin/firestore';
import type { IPersonFraternalRecordRepository, PersonFraternalRecord } from '@vl6/domain';
import type { FamilyPersonRefKind } from '@vl6/shared';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'personFraternalRecords';

export class FirestorePersonFraternalRecordRepository implements IPersonFraternalRecordRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(
        createEntityConverter<PersonFraternalRecord>([
          'dataIniciacao',
          'dataElevacao',
          'dataExaltacao',
          'passouAoOrienteEternoEm',
        ]),
      );
  }

  async findById(id: string): Promise<PersonFraternalRecord | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByPerson(
    tenantId: string,
    kind: FamilyPersonRefKind,
    id: string,
  ): Promise<PersonFraternalRecord[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('personKind', '==', kind)
      .where('personId', '==', id)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(entity: PersonFraternalRecord): Promise<void> {
    await this.collection.doc(entity.id).set(entity);
  }

  async update(entity: PersonFraternalRecord): Promise<void> {
    await this.collection.doc(entity.id).set(entity);
  }
}
