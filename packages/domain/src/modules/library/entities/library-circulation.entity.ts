import type { BaseEntity } from '../../../shared/base-entity';

export type LibraryCopyCondition =
  'novo' | 'otimo' | 'bom' | 'regular' | 'danificado' | 'restauracao';
export type LibraryCopyStatus =
  'disponivel' | 'reservado' | 'emprestado' | 'manutencao' | 'baixado';

export interface LibraryShelf extends BaseEntity {
  codigo: string;
  nome: string;
  descricao: string | null;
}

export interface LibraryCopy extends BaseEntity {
  libraryItemId: string;
  codigoTombo: string;
  shelfId?: string | null;
  localizacao: string;
  estadoGeral: LibraryCopyCondition;
  observacoes: string | null;
  situacao: LibraryCopyStatus;
}

export type LibraryLoanStatus =
  'solicitado' | 'aprovado' | 'retirado' | 'atrasado' | 'devolvido' | 'recusado' | 'cancelado';

export interface LibraryLoan extends BaseEntity {
  requestPackageId?: string;
  libraryItemId: string;
  copyId: string;
  borrowerUserId: string;
  borrowerMemberId: string | null;
  borrowerName: string;
  borrowerEmail: string | null;
  borrowerWhatsapp: string | null;
  statusEmprestimo: LibraryLoanStatus;
  requestedPickupAt: Date;
  suggestedPickupEventId: string | null;
  pickupDeadlineAt?: Date | null;
  pickupExtensionCount?: number;
  approvedAt: Date | null;
  checkedOutAt: Date | null;
  dueAt: Date;
  dueAtConfirmed?: boolean;
  suggestedReturnEventId: string | null;
  returnedAt: Date | null;
  renewalCount: number;
  librarianNotes: string | null;
  lastReminderAt: Date | null;
  reminderCount: number;
}

export type LibraryLoanEventKind =
  | 'solicitacao'
  | 'aprovacao'
  | 'prorrogacao_retirada'
  | 'nao_retirado'
  | 'recusa'
  | 'retirada'
  | 'atraso'
  | 'lembrete'
  | 'devolucao'
  | 'cancelamento';

export interface LibraryLoanEvent extends BaseEntity {
  loanId: string;
  libraryItemId: string;
  copyId: string;
  tipo: LibraryLoanEventKind;
  descricao: string;
  actorUserId: string;
  occurredAt: Date;
}

export type LibraryOccurrenceReason =
  'perda' | 'roubo' | 'extravio' | 'dano_irrecuperavel' | 'outro';
export type LibraryOccurrenceStatus = 'relatado' | 'em_analise' | 'confirmado' | 'rejeitado';

export interface LibraryOccurrence extends BaseEntity {
  libraryItemId: string;
  copyId: string;
  loanId: string | null;
  reportedByUserId: string;
  reporterName: string;
  motivo: LibraryOccurrenceReason;
  relato: string;
  occurredAt: Date;
  statusOcorrencia: LibraryOccurrenceStatus;
  previousCopyStatus?: LibraryCopyStatus;
  librarianAttestation: string | null;
  attestedByUserId: string | null;
  attestedAt: Date | null;
}

export interface LibraryReview extends BaseEntity {
  libraryItemId: string;
  userId: string;
  memberName: string;
  rating: number;
  comentario: string | null;
}

export type LibraryInteractionKind = 'visualizacao' | 'download';
export interface LibraryInteraction extends BaseEntity {
  libraryItemId: string;
  userId: string;
  tipo: LibraryInteractionKind;
  occurredAt: Date;
}
