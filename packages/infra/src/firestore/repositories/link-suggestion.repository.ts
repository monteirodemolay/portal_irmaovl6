import type { Firestore } from 'firebase-admin/firestore';
import type { ILinkSuggestionRepository, LinkSuggestion } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'linkSuggestions';
const DATE_FIELDS = ['revisadoEm'] as const;

export class FirestoreLinkSuggestionRepository implements ILinkSuggestionRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<LinkSuggestion>(DATE_FIELDS));
  }

  async findById(id: string): Promise<LinkSuggestion | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listPendingByTenant(tenantId: string): Promise<LinkSuggestion[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('revisaoStatus', '==', 'pendente')
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(suggestion: LinkSuggestion): Promise<void> {
    await this.collection.doc(suggestion.id).set(suggestion);
  }

  async update(suggestion: LinkSuggestion): Promise<void> {
    await this.collection.doc(suggestion.id).set(suggestion);
  }
}
