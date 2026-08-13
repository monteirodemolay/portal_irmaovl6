import { Timestamp, type Firestore, type Query } from 'firebase-admin/firestore';
import type { Event, IEventRepository, PageRequest, PageResult } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'events';
const DATE_FIELDS = ['dataInicio', 'dataFim'] as const;

export class FirestoreEventRepository implements IEventRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<Event>(DATE_FIELDS));
  }

  async findById(id: string): Promise<Event | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listUpcoming(tenantId: string, from: Date, page: PageRequest): Promise<PageResult<Event>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('dataInicio', '>=', Timestamp.fromDate(from))
      .orderBy('dataInicio', 'asc');
    return this.paginate(query, page);
  }

  async listAll(tenantId: string, page: PageRequest): Promise<PageResult<Event>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('dataInicio', 'desc');
    return this.paginate(query, page);
  }

  async countUpcomingByTenant(tenantId: string, from: Date): Promise<number> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('dataInicio', '>=', Timestamp.fromDate(from))
      .count()
      .get();
    return snap.data().count;
  }

  private async paginate(query: Query<Event>, page: PageRequest): Promise<PageResult<Event>> {
    let paged = query;
    if (page.cursor) {
      const cursorDoc = await this.collection.doc(page.cursor).get();
      if (cursorDoc.exists) paged = paged.startAfter(cursorDoc);
    }
    const snap = await paged.limit(page.limit + 1).get();
    const docs = snap.docs.slice(0, page.limit);
    const hasMore = snap.docs.length > page.limit;
    return {
      items: docs.map((doc) => doc.data()),
      nextCursor: hasMore ? (docs.at(-1)?.id ?? null) : null,
      hasMore,
    };
  }

  async create(event: Event): Promise<void> {
    await this.collection.doc(event.id).set(event);
  }

  async update(event: Event): Promise<void> {
    await this.collection.doc(event.id).set(event);
  }
}
