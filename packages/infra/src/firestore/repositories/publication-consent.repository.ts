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
 *
 * `source`/`recordedBy`/`confirmationChannel`/`note` chegaram na Fase 2
 * (cadastro assistido) — registros gravados antes disso não têm esses
 * campos no Firestore. Aplica defaults seguros na leitura, nunca fabricando
 * um aceite retroativo: todo registro anterior à Fase 2 só podia vir do
 * autoatendimento (`source: 'self_service'`), sem canal de confirmação
 * (`confirmationChannel: null`) nem nota (`note: null`); `recordedBy` cai
 * pro próprio `memberId` quando ausente (era sempre o titular agindo sobre
 * si mesmo antes deste campo existir).
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
    return {
      ...data,
      id: snapshot.id,
      acceptedAt: data.acceptedAt.toDate(),
      source: data.source ?? 'self_service',
      recordedBy: data.recordedBy ?? data.memberId,
      confirmationChannel: data.confirmationChannel ?? null,
      note: data.note ?? null,
    };
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
