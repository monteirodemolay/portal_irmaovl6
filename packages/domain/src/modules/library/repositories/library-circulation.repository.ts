import type {
  LibraryCopy,
  LibraryCopyStatus,
  LibraryInteraction,
  LibraryLoan,
  LibraryLoanEvent,
  LibraryOccurrence,
  LibraryReview,
  LibraryShelf,
} from '../entities/library-circulation.entity';

export interface ILibraryCirculationRepository {
  findShelfById(id: string): Promise<LibraryShelf | null>;
  listShelvesByTenant(tenantId: string): Promise<LibraryShelf[]>;
  createShelf(shelf: LibraryShelf): Promise<void>;
  updateShelfAndCopies(shelf: LibraryShelf): Promise<void>;
  deactivateShelfAndTransfer(shelf: LibraryShelf, targetShelf: LibraryShelf): Promise<number>;
  findCopyById(id: string): Promise<LibraryCopy | null>;
  listCopiesByItem(tenantId: string, libraryItemId: string): Promise<LibraryCopy[]>;
  listCopiesByTenant(tenantId: string): Promise<LibraryCopy[]>;
  createCopy(copy: LibraryCopy): Promise<void>;
  updateCopy(copy: LibraryCopy): Promise<void>;
  findLoanById(id: string): Promise<LibraryLoan | null>;
  listLoansByTenant(tenantId: string): Promise<LibraryLoan[]>;
  listLoansByUser(tenantId: string, userId: string): Promise<LibraryLoan[]>;
  /** Empréstimo em aberto (retirado/atrasado) de um exemplar específico — devolução rápida no balcão. */
  findOpenLoanByCopy(tenantId: string, copyId: string): Promise<LibraryLoan | null>;
  reserveAvailableCopy(loan: Omit<LibraryLoan, 'copyId'>): Promise<LibraryLoan | null>;
  reserveSpecificCopy(
    loan: Omit<LibraryLoan, 'copyId'>,
    copyId: string,
  ): Promise<LibraryLoan | null>;
  updateLoanAndCopy(
    loan: LibraryLoan,
    copyStatus: LibraryCopyStatus | null,
    copyPlacement?: { shelfId: string; localizacao: string },
  ): Promise<void>;
  listLoanEvents(tenantId: string, loanId: string): Promise<LibraryLoanEvent[]>;
  /** Histórico completo de um exemplar (todos os empréstimos que já passaram por ele). */
  listLoanEventsByCopy(tenantId: string, copyId: string): Promise<LibraryLoanEvent[]>;
  createLoanEvent(event: LibraryLoanEvent): Promise<void>;
  listOccurrencesByTenant(tenantId: string): Promise<LibraryOccurrence[]>;
  listOccurrencesByUser(tenantId: string, userId: string): Promise<LibraryOccurrence[]>;
  createOccurrence(occurrence: LibraryOccurrence): Promise<void>;
  updateOccurrenceAndCopy(
    occurrence: LibraryOccurrence,
    copyStatus: LibraryCopyStatus | null,
  ): Promise<void>;
  listReviewsByItem(tenantId: string, libraryItemId: string): Promise<LibraryReview[]>;
  findReviewByUser(
    tenantId: string,
    libraryItemId: string,
    userId: string,
  ): Promise<LibraryReview | null>;
  upsertReview(review: LibraryReview): Promise<void>;
  listInteractionsByItem(tenantId: string, libraryItemId: string): Promise<LibraryInteraction[]>;
  listInteractionsByUser(tenantId: string, userId: string): Promise<LibraryInteraction[]>;
  recordInteraction(interaction: LibraryInteraction): Promise<void>;
}
