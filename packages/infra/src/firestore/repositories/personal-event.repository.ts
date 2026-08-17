import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { IPersonalEventRepository, PersonalEvent } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'personalEvents';
const DATE_FIELDS = ['dataInicio', 'dataFim'] as const;

export class FirestorePersonalEventRepository implements IPersonalEventRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<PersonalEvent>(DATE_FIELDS));
  }

  async findById(id: string): Promise<PersonalEvent | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByUserInRange(
    tenantId: string,
    userId: string,
    from: Date,
    to: Date,
  ): Promise<PersonalEvent[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .where('deletedAt', '==', null)
      .where('dataInicio', '>=', Timestamp.fromDate(from))
      .where('dataInicio', '<=', Timestamp.fromDate(to))
      .orderBy('dataInicio', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(event: PersonalEvent): Promise<void> {
    await this.collection.doc(event.id).set(event);
  }

  async update(event: PersonalEvent): Promise<void> {
    await this.collection.doc(event.id).set(event);
  }
}
