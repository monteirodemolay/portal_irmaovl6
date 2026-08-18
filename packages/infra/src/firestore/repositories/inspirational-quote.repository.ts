import type { Firestore } from 'firebase-admin/firestore';
import type { InspirationalQuote, IInspirationalQuoteRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'inspirationalQuotes';

export class FirestoreInspirationalQuoteRepository implements IInspirationalQuoteRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<InspirationalQuote>([]));
  }

  async findById(id: string): Promise<InspirationalQuote | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listAll(tenantId: string): Promise<InspirationalQuote[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listActive(tenantId: string): Promise<InspirationalQuote[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('ativa', '==', true)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(quote: InspirationalQuote): Promise<void> {
    await this.collection.doc(quote.id).set(quote);
  }

  async update(quote: InspirationalQuote): Promise<void> {
    await this.collection.doc(quote.id).set(quote);
  }
}
