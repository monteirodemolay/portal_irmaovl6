import { FieldValue, type Firestore, type Query } from 'firebase-admin/firestore';
import type { ArchiveItem, IArchiveItemRepository, PageRequest, PageResult } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'archiveItems';

export class FirestoreArchiveItemRepository implements IArchiveItemRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ArchiveItem>(['publicarEm']));
  }

  async findById(id: string): Promise<ArchiveItem | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveItem>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc');
    return this.paginate(query, page);
  }

  async findByEventId(eventId: string): Promise<ArchiveItem[]> {
    const snap = await this.collection
      .where('eventId', '==', eventId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async findDeletedByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveItem>> {
    const query = this.collection.where('tenantId', '==', tenantId).where('deletedAt', '!=', null);
    return this.paginate(query, page);
  }

  async findScheduledForPublication(tenantId: string, now: Date): Promise<ArchiveItem[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('publicacaoStatus', '==', 'pronto_para_publicar')
      .where('publicarEm', '<=', now)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async countByTenant(tenantId: string): Promise<number> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .count()
      .get();
    return snap.data().count;
  }

  async countPublishedByTenant(tenantId: string): Promise<number> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('publicacaoStatus', '==', 'publicado')
      .count()
      .get();
    return snap.data().count;
  }

  private async paginate(
    query: Query<ArchiveItem>,
    page: PageRequest,
  ): Promise<PageResult<ArchiveItem>> {
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

  async create(item: ArchiveItem): Promise<void> {
    await this.collection.doc(item.id).set(item);
  }

  async update(item: ArchiveItem): Promise<void> {
    await this.collection.doc(item.id).set(item);
  }

  async softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void> {
    await this.collection.doc(id).update({
      deletedAt,
      updatedAt: deletedAt,
      updatedBy,
      status: 'archived',
      ativo: false,
    });
  }

  async restore(id: string, updatedBy: string): Promise<void> {
    await this.collection.doc(id).update({
      deletedAt: null,
      updatedAt: new Date(),
      updatedBy,
      status: 'active',
      ativo: true,
    });
  }

  async incrementViews(id: string): Promise<void> {
    await this.collection.doc(id).update({ contagemVisualizacoes: FieldValue.increment(1) });
  }
}
