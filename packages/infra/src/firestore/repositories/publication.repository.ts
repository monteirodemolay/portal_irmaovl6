import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { IPublicationRepository, Publication, PublicationAsset } from '@vl6/domain';
import type { PublicationSourceType, PublicationStatus } from '@vl6/shared';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'publications';
const DATE_FIELDS = ['scheduledFor', 'approvedAt', 'publishedAt'] as const;

/**
 * `Publication.assets[].generatedAt` é uma data ANINHADA num array — o
 * `createEntityConverter` genérico só cobre campos de data no nível raiz do
 * documento (ver `entity.converter.ts`), por isso a conversão Timestamp↔Date
 * de cada asset é feita manualmente aqui, não pela fábrica compartilhada.
 */
function assetsToFirestore(assets: PublicationAsset[]) {
  return assets.map((asset) => ({ ...asset, generatedAt: Timestamp.fromDate(asset.generatedAt) }));
}

function assetsFromFirestore(assets: unknown): PublicationAsset[] {
  if (!Array.isArray(assets)) return [];
  return assets.map((asset) => ({
    ...asset,
    generatedAt:
      asset.generatedAt instanceof Timestamp ? asset.generatedAt.toDate() : asset.generatedAt,
  }));
}

export class FirestorePublicationRepository implements IPublicationRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<Publication>(DATE_FIELDS));
  }

  private hydrate(publication: Publication): Publication {
    return { ...publication, assets: assetsFromFirestore(publication.assets) };
  }

  async findById(id: string): Promise<Publication | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? this.hydrate(snap.data()!) : null;
  }

  async listByStatus(
    tenantId: string,
    statuses: PublicationStatus[] | null,
  ): Promise<Publication[]> {
    let query = this.collection.where('tenantId', '==', tenantId).where('deletedAt', '==', null);
    // Firestore limita `in` a 10 valores — folgado o bastante pros 5 status existentes.
    if (statuses && statuses.length > 0) {
      query = query.where('publicacaoStatus', 'in', statuses);
    }
    const snap = await query.get();
    return snap.docs.map((doc) => this.hydrate(doc.data()));
  }

  async findBySource(
    tenantId: string,
    sourceType: PublicationSourceType,
    sourceId: string,
    scheduledForDay: string,
  ): Promise<Publication | null> {
    const dayStart = new Date(`${scheduledForDay}T00:00:00.000Z`);
    const dayEnd = new Date(`${scheduledForDay}T23:59:59.999Z`);
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('sourceType', '==', sourceType)
      .where('sourceId', '==', sourceId)
      .where('deletedAt', '==', null)
      .where('scheduledFor', '>=', Timestamp.fromDate(dayStart))
      .where('scheduledFor', '<=', Timestamp.fromDate(dayEnd))
      .limit(1)
      .get();
    return snap.empty ? null : this.hydrate(snap.docs[0]!.data());
  }

  async create(publication: Publication): Promise<void> {
    await this.collection
      .doc(publication.id)
      .set({
        ...publication,
        assets: assetsToFirestore(publication.assets),
      } as unknown as Publication);
  }

  async update(publication: Publication): Promise<void> {
    await this.collection
      .doc(publication.id)
      .set({
        ...publication,
        assets: assetsToFirestore(publication.assets),
      } as unknown as Publication);
  }
}
