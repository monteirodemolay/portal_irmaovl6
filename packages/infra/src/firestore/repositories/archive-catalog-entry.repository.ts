import type { Firestore } from 'firebase-admin/firestore';
import type { ArchiveCatalogEntry, IArchiveCatalogEntryRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'archiveCatalogEntries';

export class FirestoreArchiveCatalogEntryRepository implements IArchiveCatalogEntryRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ArchiveCatalogEntry>([]));
  }

  async findById(id: string): Promise<ArchiveCatalogEntry | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByOrigemId(tenantId: string, origemId: string): Promise<ArchiveCatalogEntry | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('origemId', '==', origemId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByTenant(tenantId: string): Promise<ArchiveCatalogEntry[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(entry: ArchiveCatalogEntry): Promise<void> {
    await this.collection.doc(entry.id).set(entry);
  }

  async update(entry: ArchiveCatalogEntry): Promise<void> {
    await this.collection.doc(entry.id).set(entry);
  }
}
