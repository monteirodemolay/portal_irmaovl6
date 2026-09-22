import {
  Timestamp,
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type {
  ILegalDocumentAcceptanceRepository,
  LegalDocumentAcceptance,
  LegalDocumentKey,
} from '@vl6/domain';

const COLLECTION = 'legalDocumentAcceptances';

/** Append-only, mesma natureza de `AuditLog`/`PublicationConsent` — converter dedicado. */
const legalDocumentAcceptanceConverter: FirestoreDataConverter<LegalDocumentAcceptance> = {
  toFirestore(entry: LegalDocumentAcceptance) {
    const { id: _id, ...rest } = entry;
    return { ...rest, aceitoEm: Timestamp.fromDate(entry.aceitoEm) };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): LegalDocumentAcceptance {
    const data = snapshot.data() as Omit<LegalDocumentAcceptance, 'id' | 'aceitoEm'> & {
      aceitoEm: Timestamp;
    };
    return { ...data, id: snapshot.id, aceitoEm: data.aceitoEm.toDate() };
  },
};

export class FirestoreLegalDocumentAcceptanceRepository implements ILegalDocumentAcceptanceRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(legalDocumentAcceptanceConverter);
  }

  async append(acceptance: LegalDocumentAcceptance): Promise<void> {
    await this.collection.doc(acceptance.id).set(acceptance);
  }

  async findLatestByUser(
    tenantId: string,
    userId: string,
    documento: LegalDocumentKey,
  ): Promise<LegalDocumentAcceptance | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .where('documento', '==', documento)
      .orderBy('aceitoEm', 'desc')
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByUser(tenantId: string, userId: string): Promise<LegalDocumentAcceptance[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .orderBy('aceitoEm', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }
}
