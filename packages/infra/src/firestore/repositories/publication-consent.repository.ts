import {
  Timestamp,
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type { IPublicationConsentRepository, PublicationConsent } from '@vl6/domain';

const COLLECTION = 'publicationConsents';

/**
 * `PublicationConsent` não estende `BaseEntity` (é append-only, sem soft
 * delete — mesma natureza de `AuditLog`) — converter dedicado, mesmo padrão
 * de `audit-log.repository.ts`.
 */
const publicationConsentConverter: FirestoreDataConverter<PublicationConsent> = {
  toFirestore(entry: PublicationConsent) {
    const { id: _id, ...rest } = entry;
    return { ...rest, acceptedAt: Timestamp.fromDate(entry.acceptedAt) };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): PublicationConsent {
    const data = snapshot.data() as Omit<PublicationConsent, 'id' | 'acceptedAt'> & {
      acceptedAt: Timestamp;
    };
    return { ...data, id: snapshot.id, acceptedAt: data.acceptedAt.toDate() };
  },
};

export class FirestorePublicationConsentRepository implements IPublicationConsentRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(publicationConsentConverter);
  }

  async listByMemberId(tenantId: string, memberId: string): Promise<PublicationConsent[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('memberId', '==', memberId)
      .orderBy('acceptedAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  /** Único método de escrita — nunca update/delete, cada mudança é um novo registro. */
  async append(consent: PublicationConsent): Promise<void> {
    await this.collection.doc(consent.id).set(consent);
  }
}
