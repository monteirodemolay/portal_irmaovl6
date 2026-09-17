import type { LibraryLoanStatus } from '../entities/library-circulation.entity';

export const OPEN_LIBRARY_LOAN_STATUSES: readonly LibraryLoanStatus[] = [
  'solicitado',
  'aprovado',
  'retirado',
  'atrasado',
];
const NEXT: Partial<Record<LibraryLoanStatus, readonly LibraryLoanStatus[]>> = {
  solicitado: ['aprovado', 'recusado', 'cancelado'],
  aprovado: ['retirado', 'cancelado'],
  retirado: ['devolvido', 'atrasado'],
  atrasado: ['devolvido'],
};
export const isLibraryLoanOpen = (status: LibraryLoanStatus) =>
  OPEN_LIBRARY_LOAN_STATUSES.includes(status);
export const canTransitionLibraryLoan = (current: LibraryLoanStatus, next: LibraryLoanStatus) =>
  NEXT[current]?.includes(next) ?? false;
export function isReasonableLibraryLoanDueDate(
  pickupAt: Date,
  dueAt: Date,
  maximumDays = 180,
): boolean {
  const maximum = new Date(pickupAt);
  maximum.setDate(maximum.getDate() + maximumDays);
  return (
    !Number.isNaN(pickupAt.getTime()) &&
    !Number.isNaN(dueAt.getTime()) &&
    dueAt >= pickupAt &&
    dueAt <= maximum
  );
}
export function isReasonableLibraryPickupDeadline(
  pickupAt: Date,
  deadline: Date,
  maximumDays = 30,
): boolean {
  const maximum = new Date(pickupAt);
  maximum.setDate(maximum.getDate() + maximumDays);
  return (
    !Number.isNaN(pickupAt.getTime()) &&
    !Number.isNaN(deadline.getTime()) &&
    deadline >= pickupAt &&
    deadline <= maximum
  );
}
export function isLibraryPickupExpired(
  status: LibraryLoanStatus,
  deadline: Date | null | undefined,
  now = new Date(),
): boolean {
  return status === 'aprovado' && Boolean(deadline && deadline < now);
}
