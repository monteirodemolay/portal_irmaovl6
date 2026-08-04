import type { Firestore } from 'firebase-admin/firestore';
import type { IUserRepository, User } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'users';

export class FirestoreUserRepository implements IUserRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(createEntityConverter<User>());
  }

  async findById(uid: string): Promise<User | null> {
    const snap = await this.collection.doc(uid).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('email', '==', email)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(user: User): Promise<void> {
    await this.collection.doc(user.id).set(user);
  }

  async update(user: User): Promise<void> {
    await this.collection.doc(user.id).set(user);
  }
}
