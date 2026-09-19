import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type {
  ILibraryCirculationRepository,
  LibraryCopy,
  LibraryCopyStatus,
  LibraryInteraction,
  LibraryLoan,
  LibraryLoanEvent,
  LibraryOccurrence,
  LibraryReview,
  LibraryShelf,
} from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

export class FirestoreLibraryCirculationRepository implements ILibraryCirculationRepository {
  private readonly shelves;
  private readonly copies;
  private readonly loans;
  private readonly reviews;
  private readonly interactions;
  private readonly loanEvents;
  private readonly occurrences;
  constructor(private readonly db: Firestore) {
    this.shelves = db
      .collection('libraryShelves')
      .withConverter(createEntityConverter<LibraryShelf>());
    this.copies = db
      .collection('libraryCopies')
      .withConverter(createEntityConverter<LibraryCopy>());
    this.loans = db
      .collection('libraryLoans')
      .withConverter(
        createEntityConverter<LibraryLoan>([
          'requestedPickupAt',
          'pickupDeadlineAt',
          'approvedAt',
          'checkedOutAt',
          'dueAt',
          'returnedAt',
          'lastReminderAt',
        ]),
      );
    this.reviews = db
      .collection('libraryReviews')
      .withConverter(createEntityConverter<LibraryReview>());
    this.interactions = db
      .collection('libraryInteractions')
      .withConverter(createEntityConverter<LibraryInteraction>(['occurredAt']));
    this.loanEvents = db
      .collection('libraryLoanEvents')
      .withConverter(createEntityConverter<LibraryLoanEvent>(['occurredAt']));
    this.occurrences = db
      .collection('libraryOccurrences')
      .withConverter(createEntityConverter<LibraryOccurrence>(['occurredAt', 'attestedAt']));
  }
  async findShelfById(id: string) {
    const s = await this.shelves.doc(id).get();
    return s.exists ? s.data()! : null;
  }
  async listShelvesByTenant(tenantId: string) {
    const s = await this.shelves
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('codigo')
      .get();
    return s.docs.map((d) => d.data());
  }
  async createShelf(shelf: LibraryShelf) {
    await this.shelves.doc(shelf.id).set(shelf);
  }
  async updateShelfAndCopies(shelf: LibraryShelf) {
    const copies = await this.copies.where('shelfId', '==', shelf.id).get();
    const b = this.db.batch();
    b.set(this.shelves.doc(shelf.id), shelf);
    for (const c of copies.docs)
      b.update(c.ref, {
        localizacao: `${shelf.codigo} · ${shelf.nome}`,
        updatedAt: shelf.updatedAt,
        updatedBy: shelf.updatedBy,
      });
    await b.commit();
  }
  async deactivateShelfAndTransfer(shelf: LibraryShelf, target: LibraryShelf) {
    const copies = await this.copies.where('shelfId', '==', shelf.id).get();
    const b = this.db.batch();
    b.set(this.shelves.doc(shelf.id), shelf);
    for (const c of copies.docs)
      b.update(c.ref, {
        shelfId: target.id,
        localizacao: `${target.codigo} · ${target.nome}`,
        updatedAt: shelf.updatedAt,
        updatedBy: shelf.updatedBy,
      });
    await b.commit();
    return copies.size;
  }
  async findCopyById(id: string) {
    const s = await this.copies.doc(id).get();
    return s.exists ? s.data()! : null;
  }
  async listCopiesByItem(tenantId: string, libraryItemId: string) {
    const s = await this.copies
      .where('tenantId', '==', tenantId)
      .where('libraryItemId', '==', libraryItemId)
      .where('deletedAt', '==', null)
      .orderBy('codigoTombo')
      .get();
    return s.docs.map((d) => d.data());
  }
  async listCopiesByTenant(tenantId: string) {
    const s = await this.copies
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async createCopy(copy: LibraryCopy) {
    await this.copies.doc(copy.id).set(copy);
  }
  async updateCopy(copy: LibraryCopy) {
    await this.copies.doc(copy.id).set(copy);
  }
  async findLoanById(id: string) {
    const s = await this.loans.doc(id).get();
    return s.exists ? s.data()! : null;
  }
  async listLoansByTenant(tenantId: string) {
    const s = await this.loans
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async listLoansByUser(tenantId: string, userId: string) {
    const s = await this.loans
      .where('tenantId', '==', tenantId)
      .where('borrowerUserId', '==', userId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async reserveAvailableCopy(loan: Omit<LibraryLoan, 'copyId'>) {
    return this.db.runTransaction(async (t) => {
      const a = await t.get(
        this.copies
          .where('tenantId', '==', loan.tenantId)
          .where('libraryItemId', '==', loan.libraryItemId)
          .where('situacao', '==', 'disponivel')
          .where('deletedAt', '==', null)
          .limit(1),
      );
      const d = a.docs[0];
      if (!d) return null;
      const reserved = { ...loan, copyId: d.id };
      t.set(this.loans.doc(loan.id), reserved);
      t.update(d.ref, {
        situacao: 'reservado',
        updatedAt: loan.updatedAt,
        updatedBy: loan.updatedBy,
      });
      return reserved;
    });
  }
  async reserveSpecificCopy(loan: Omit<LibraryLoan, 'copyId'>, copyId: string) {
    return this.db.runTransaction(async (t) => {
      const ref = this.copies.doc(copyId);
      const snap = await t.get(ref);
      const copy = snap.exists ? snap.data()! : null;
      if (
        !copy ||
        copy.tenantId !== loan.tenantId ||
        copy.libraryItemId !== loan.libraryItemId ||
        copy.situacao !== 'disponivel'
      )
        return null;
      const reserved = { ...loan, copyId };
      t.set(this.loans.doc(loan.id), reserved);
      t.update(ref, {
        situacao: 'reservado',
        updatedAt: loan.updatedAt,
        updatedBy: loan.updatedBy,
      });
      return reserved;
    });
  }
  async updateLoanAndCopy(
    loan: LibraryLoan,
    copyStatus: LibraryCopyStatus | null,
    placement?: { shelfId: string; localizacao: string },
  ) {
    await this.db.runTransaction(async (t) => {
      t.set(this.loans.doc(loan.id), loan);
      if (copyStatus)
        t.update(this.copies.doc(loan.copyId), {
          situacao: copyStatus,
          ...(placement ?? {}),
          updatedAt: loan.updatedAt,
          updatedBy: loan.updatedBy,
        });
    });
  }
  async listLoanEvents(tenantId: string, loanId: string) {
    const s = await this.loanEvents
      .where('tenantId', '==', tenantId)
      .where('loanId', '==', loanId)
      .orderBy('occurredAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async listLoanEventsByCopy(tenantId: string, copyId: string) {
    // Sem `orderBy` de propósito: duas igualdades (`tenantId`+`copyId`) já são
    // cobertas pelos índices automáticos do Firestore, sem precisar de um
    // índice composto novo. Ordena em memória — a única chamadora (histórico
    // do exemplar) já reordena a timeline combinada com ocorrências mesmo
    // assim, então isso não muda nenhum comportamento visível.
    const s = await this.loanEvents
      .where('tenantId', '==', tenantId)
      .where('copyId', '==', copyId)
      .get();
    return s.docs
      .map((d) => d.data())
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }
  async createLoanEvent(event: LibraryLoanEvent) {
    await this.loanEvents.doc(event.id).set(event);
  }
  async listOccurrencesByTenant(tenantId: string) {
    const s = await this.occurrences
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async listOccurrencesByUser(tenantId: string, userId: string) {
    const s = await this.occurrences
      .where('tenantId', '==', tenantId)
      .where('reportedByUserId', '==', userId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async createOccurrence(o: LibraryOccurrence) {
    await this.occurrences.doc(o.id).set(o);
  }
  async updateOccurrenceAndCopy(o: LibraryOccurrence, status: LibraryCopyStatus | null) {
    await this.db.runTransaction(async (t) => {
      t.set(this.occurrences.doc(o.id), o);
      if (status)
        t.update(this.copies.doc(o.copyId), {
          situacao: status,
          updatedAt: o.updatedAt,
          updatedBy: o.updatedBy,
        });
    });
  }
  async listReviewsByItem(tenantId: string, itemId: string) {
    const s = await this.reviews
      .where('tenantId', '==', tenantId)
      .where('libraryItemId', '==', itemId)
      .where('deletedAt', '==', null)
      .orderBy('updatedAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async findReviewByUser(tenantId: string, itemId: string, userId: string) {
    const s = await this.reviews
      .where('tenantId', '==', tenantId)
      .where('libraryItemId', '==', itemId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    return s.empty ? null : s.docs[0]!.data();
  }
  async upsertReview(review: LibraryReview) {
    await this.db.runTransaction(async (t) => {
      const ref = this.reviews.doc(review.id);
      const before = await t.get(ref);
      const old = before.exists ? before.data()!.rating : 0;
      t.set(ref, review);
      t.update(this.db.collection('libraryItems').doc(review.libraryItemId), {
        somaAvaliacoes: FieldValue.increment(review.rating - old),
        quantidadeAvaliacoes: FieldValue.increment(before.exists ? 0 : 1),
      });
    });
  }
  async listInteractionsByItem(tenantId: string, itemId: string) {
    const s = await this.interactions
      .where('tenantId', '==', tenantId)
      .where('libraryItemId', '==', itemId)
      .orderBy('occurredAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async listInteractionsByUser(tenantId: string, userId: string) {
    const s = await this.interactions
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .orderBy('occurredAt', 'desc')
      .get();
    return s.docs.map((d) => d.data());
  }
  async recordInteraction(i: LibraryInteraction) {
    await this.interactions.doc(i.id).set(i);
  }
}
