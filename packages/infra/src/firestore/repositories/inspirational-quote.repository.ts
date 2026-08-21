import type { Firestore } from 'firebase-admin/firestore';
import type {
  InspirationalQuote,
  IInspirationalQuoteRepository,
  PageRequest,
  PageResult,
} from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';
import { paginateInMemory } from '../paginate-in-memory';

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

  async listConcluded(
    tenantId: string,
    page: PageRequest,
  ): Promise<PageResult<InspirationalQuote>> {
    const [inativas, excluidas] = await Promise.all([
      this.collection
        .where('tenantId', '==', tenantId)
        .where('deletedAt', '==', null)
        .where('ativa', '==', false)
        .get(),
      this.collection.where('tenantId', '==', tenantId).where('deletedAt', '!=', null).get(),
    ]);
    const byId = new Map<string, InspirationalQuote>();
    for (const doc of [...inativas.docs, ...excluidas.docs]) {
      byId.set(doc.id, doc.data());
    }
    const items = [...byId.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return paginateInMemory(items, page);
  }

  async create(quote: InspirationalQuote): Promise<void> {
    await this.collection.doc(quote.id).set(quote);
  }

  async update(quote: InspirationalQuote): Promise<void> {
    await this.collection.doc(quote.id).set(quote);
  }

  async hardDelete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
