import {
  Timestamp,
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type {
  ILegalDocumentVersionRepository,
  LegalDocumentKey,
  LegalDocumentVersion,
} from '@vl6/domain';

const COLLECTION = 'legalDocumentVersions';

/**
 * `LegalDocumentVersion` não estende `BaseEntity` (é append-only, sem soft
 * delete — mesma natureza de `AuditLog`/`PublicationConsent`) — converter
 * dedicado, mesmo padrão de `publication-consent.repository.ts`.
 */
const legalDocumentVersionConverter: FirestoreDataConverter<LegalDocumentVersion> = {
  toFirestore(entry: LegalDocumentVersion) {
    const { id: _id, ...rest } = entry;
    return { ...rest, publicadoEm: Timestamp.fromDate(entry.publicadoEm) };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): LegalDocumentVersion {
    const data = snapshot.data() as Omit<LegalDocumentVersion, 'id' | 'publicadoEm'> & {
      publicadoEm: Timestamp;
    };
    return { ...data, id: snapshot.id, publicadoEm: data.publicadoEm.toDate() };
  },
};

export class FirestoreLegalDocumentVersionRepository implements ILegalDocumentVersionRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(legalDocumentVersionConverter);
  }

  async append(version: LegalDocumentVersion): Promise<void> {
    await this.collection.doc(version.id).set(version);
  }

  async findCurrent(
    tenantId: string,
    documento: LegalDocumentKey,
  ): Promise<LegalDocumentVersion | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('documento', '==', documento)
      .orderBy('publicadoEm', 'desc')
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByDocumento(
    tenantId: string,
    documento: LegalDocumentKey,
  ): Promise<LegalDocumentVersion[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('documento', '==', documento)
      .orderBy('publicadoEm', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }
}
