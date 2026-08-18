import type { Firestore } from 'firebase-admin/firestore';
import type { IPersonalNoteRepository, PersonalNote } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'personalNotes';

export class FirestorePersonalNoteRepository implements IPersonalNoteRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<PersonalNote>());
  }

  async findById(id: string): Promise<PersonalNote | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByUser(tenantId: string, userId: string): Promise<PersonalNote[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async findByEvent(
    tenantId: string,
    userId: string,
    eventoOrigem: string,
    eventoId: string,
  ): Promise<PersonalNote | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .where('deletedAt', '==', null)
      .where('eventoOrigem', '==', eventoOrigem)
      .where('eventoId', '==', eventoId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(note: PersonalNote): Promise<void> {
    await this.collection.doc(note.id).set(note);
  }

  async update(note: PersonalNote): Promise<void> {
    await this.collection.doc(note.id).set(note);
  }
}
