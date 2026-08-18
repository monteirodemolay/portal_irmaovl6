import type { Firestore } from 'firebase-admin/firestore';
import type { IPersonalTaskRepository, PersonalTask } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'personalTasks';

export class FirestorePersonalTaskRepository implements IPersonalTaskRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<PersonalTask>());
  }

  async findById(id: string): Promise<PersonalTask | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByUser(tenantId: string, userId: string): Promise<PersonalTask[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(task: PersonalTask): Promise<void> {
    await this.collection.doc(task.id).set(task);
  }

  async update(task: PersonalTask): Promise<void> {
    await this.collection.doc(task.id).set(task);
  }
}
