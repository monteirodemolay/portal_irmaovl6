import type { Firestore, Query } from 'firebase-admin/firestore';
import type { ArchiveMedia, IArchiveMediaRepository, PageRequest, PageResult } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'archiveMedia';

export class FirestoreArchiveMediaRepository implements IArchiveMediaRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ArchiveMedia>([]));
  }

  async findById(id: string): Promise<ArchiveMedia | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveMedia>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc');
    return this.paginate(query, page);
  }

  async findByArchiveItemId(archiveItemId: string): Promise<ArchiveMedia[]> {
    const snap = await this.collection
      .where('archiveItemId', '==', archiveItemId)
      .where('deletedAt', '==', null)
      .orderBy('order', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async findDeletedByTenant(
    tenantId: string,
    page: PageRequest,
  ): Promise<PageResult<ArchiveMedia>> {
    const query = this.collection.where('tenantId', '==', tenantId).where('deletedAt', '!=', null);
    return this.paginate(query, page);
  }

  async findByPessoaIdentificada(tenantId: string, memberId: string): Promise<ArchiveMedia[]> {
    const snap = await this.collection
      .where('pessoasIdentificadas', 'array-contains', memberId)
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  private async paginate(
    query: Query<ArchiveMedia>,
    page: PageRequest,
  ): Promise<PageResult<ArchiveMedia>> {
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

  async create(archiveMedia: ArchiveMedia): Promise<void> {
    await this.collection.doc(archiveMedia.id).set(archiveMedia);
  }

  async update(archiveMedia: ArchiveMedia): Promise<void> {
    await this.collection.doc(archiveMedia.id).set(archiveMedia);
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
}
