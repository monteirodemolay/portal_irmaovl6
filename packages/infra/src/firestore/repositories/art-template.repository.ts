import type { Firestore } from 'firebase-admin/firestore';
import type { ArtTemplate, IArtTemplateRepository } from '@vl6/domain';
import type { ArtTemplateType } from '@vl6/shared';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'artTemplates';

export class FirestoreArtTemplateRepository implements IArtTemplateRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(createEntityConverter<ArtTemplate>());
  }

  async findById(id: string): Promise<ArtTemplate | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listAll(tenantId: string): Promise<ArtTemplate[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listActiveByType(tenantId: string, type: ArtTemplateType): Promise<ArtTemplate[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('type', '==', type)
      .where('active', '==', true)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(template: ArtTemplate): Promise<void> {
    await this.collection.doc(template.id).set(template);
  }

  async update(template: ArtTemplate): Promise<void> {
    await this.collection.doc(template.id).set(template);
  }
}
