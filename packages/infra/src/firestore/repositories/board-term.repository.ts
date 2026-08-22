import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { BoardTerm, IBoardTermRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'boardTerms';
const DATE_FIELDS = ['periodoInicio', 'periodoFim'] as const;

export class FirestoreBoardTermRepository implements IBoardTermRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<BoardTerm>(DATE_FIELDS));
  }

  async findById(id: string): Promise<BoardTerm | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findActive(tenantId: string, at: Date = new Date()): Promise<BoardTerm | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('periodoInicio', '<=', Timestamp.fromDate(at))
      .orderBy('periodoInicio', 'desc')
      .limit(5)
      .get();

    const candidate = snap.docs
      .map((doc) => doc.data())
      .find((term) => term.periodoFim >= at && term.deletedAt === null);
    return candidate ?? null;
  }

  /** Mesma lógica de `findActive`, com data explícita em vez do padrão "agora" — Fase 1 do Acervo VL6. */
  async findByDate(tenantId: string, date: Date): Promise<BoardTerm | null> {
    return this.findActive(tenantId, date);
  }

  async listByTenant(tenantId: string): Promise<BoardTerm[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('periodoInicio', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async overlaps(
    tenantId: string,
    periodoInicio: Date,
    periodoFim: Date,
    excludeId?: string,
  ): Promise<boolean> {
    const terms = await this.listByTenant(tenantId);
    return terms.some(
      (t) => t.id !== excludeId && periodoInicio <= t.periodoFim && periodoFim >= t.periodoInicio,
    );
  }

  async create(term: BoardTerm): Promise<void> {
    await this.collection.doc(term.id).set(term);
  }

  async update(term: BoardTerm): Promise<void> {
    await this.collection.doc(term.id).set(term);
  }
}
