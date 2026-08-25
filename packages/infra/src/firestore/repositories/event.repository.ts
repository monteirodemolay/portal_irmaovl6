import { Timestamp, type Firestore, type Query } from 'firebase-admin/firestore';
import type { Event, IEventRepository, PageRequest, PageResult } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';
import { paginateInMemory } from '../paginate-in-memory';

const COLLECTION = 'events';
const DATE_FIELDS = ['dataInicio', 'dataFim'] as const;

/**
 * Preenche os campos da Fase 1 da Fundação do Acervo VL6
 * (docs/architecture/11-acervo-vl6.md §11.5) com um default seguro em
 * eventos gravados antes desta fase — sem isso, `boardTermId`/`nivelAcesso`/
 * `exibirNaLinhaDoTempo` viriam `undefined` do Firestore. Default de
 * `nivelAcesso` é "irmãos" (visibilidade equivalente à leitura atual, já
 * que todo Irmão tem `event:read`); `exibirNaLinhaDoTempo` default `true`.
 * `grau` (Central de Comunicação) segue o mesmo cuidado — default `null`
 * pra eventos gravados antes desse campo existir.
 */
function withDefaults(event: Event): Event {
  return {
    ...event,
    boardTermId: event.boardTermId ?? null,
    nivelAcesso: event.nivelAcesso ?? 'irmaos',
    exibirNaLinhaDoTempo: event.exibirNaLinhaDoTempo ?? true,
    grau: event.grau ?? null,
  };
}

export class FirestoreEventRepository implements IEventRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<Event>(DATE_FIELDS));
  }

  async findById(id: string): Promise<Event | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? withDefaults(snap.data()!) : null;
  }

  async listUpcoming(tenantId: string, from: Date, page: PageRequest): Promise<PageResult<Event>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('dataInicio', '>=', Timestamp.fromDate(from))
      .orderBy('dataInicio', 'asc');
    return this.paginate(query, page);
  }

  async listAll(tenantId: string, page: PageRequest): Promise<PageResult<Event>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('dataInicio', 'desc');
    return this.paginate(query, page);
  }

  async listInRange(tenantId: string, from: Date, to: Date): Promise<Event[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('dataInicio', '>=', Timestamp.fromDate(from))
      .where('dataInicio', '<=', Timestamp.fromDate(to))
      .orderBy('dataInicio', 'asc')
      .get();
    return snap.docs.map((doc) => withDefaults(doc.data()));
  }

  async countUpcomingByTenant(tenantId: string, from: Date): Promise<number> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('dataInicio', '>=', Timestamp.fromDate(from))
      .count()
      .get();
    return snap.data().count;
  }

  async listConcluded(
    tenantId: string,
    page: PageRequest,
    at: Date = new Date(),
  ): Promise<PageResult<Event>> {
    // "Passado" = dataFim (se houver) ou dataInicio antes de `at` — duas
    // consultas mescladas, mesma estratégia de `AnnouncementRepository`.
    const [semFim, comFim, excluidos] = await Promise.all([
      this.collection
        .where('tenantId', '==', tenantId)
        .where('deletedAt', '==', null)
        .where('dataFim', '==', null)
        .where('dataInicio', '<', Timestamp.fromDate(at))
        .get(),
      this.collection
        .where('tenantId', '==', tenantId)
        .where('deletedAt', '==', null)
        .where('dataFim', '<', Timestamp.fromDate(at))
        .get(),
      this.collection.where('tenantId', '==', tenantId).where('deletedAt', '!=', null).get(),
    ]);
    const byId = new Map<string, Event>();
    for (const doc of [...semFim.docs, ...comFim.docs, ...excluidos.docs]) {
      byId.set(doc.id, withDefaults(doc.data()));
    }
    const items = [...byId.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return paginateInMemory(items, page);
  }

  private async paginate(query: Query<Event>, page: PageRequest): Promise<PageResult<Event>> {
    let paged = query;
    if (page.cursor) {
      const cursorDoc = await this.collection.doc(page.cursor).get();
      if (cursorDoc.exists) paged = paged.startAfter(cursorDoc);
    }
    const snap = await paged.limit(page.limit + 1).get();
    const docs = snap.docs.slice(0, page.limit);
    const hasMore = snap.docs.length > page.limit;
    return {
      items: docs.map((doc) => withDefaults(doc.data())),
      nextCursor: hasMore ? (docs.at(-1)?.id ?? null) : null,
      hasMore,
    };
  }

  async create(event: Event): Promise<void> {
    await this.collection.doc(event.id).set(event);
  }

  async update(event: Event): Promise<void> {
    await this.collection.doc(event.id).set(event);
  }

  async hardDelete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
