import { describe, expect, it } from 'vitest';
import {
  canTransitionLibraryLoan,
  isLibraryLoanOpen,
  isLibraryPickupExpired,
  isReasonableLibraryLoanDueDate,
} from './library-circulation-policy';

describe('library circulation policy', () => {
  it('mantém apenas estados operacionais como abertos', () => {
    expect(isLibraryLoanOpen('solicitado')).toBe(true);
    expect(isLibraryLoanOpen('atrasado')).toBe(true);
    expect(isLibraryLoanOpen('devolvido')).toBe(false);
  });

  it('impede saltos que burlariam a conferência do Bibliotecário', () => {
    expect(canTransitionLibraryLoan('solicitado', 'aprovado')).toBe(true);
    expect(canTransitionLibraryLoan('solicitado', 'retirado')).toBe(false);
    expect(canTransitionLibraryLoan('retirado', 'devolvido')).toBe(true);
  });

  it('limita o prazo de empréstimo a uma janela razoável', () => {
    const pickup = new Date('2026-09-01T12:00:00Z');
    expect(isReasonableLibraryLoanDueDate(pickup, new Date('2026-09-22T12:00:00Z'))).toBe(true);
    expect(isReasonableLibraryLoanDueDate(pickup, new Date('2027-09-01T12:00:00Z'))).toBe(false);
  });

  it('só expira reserva aprovada após o limite de retirada', () => {
    const deadline = new Date('2026-09-10T23:59:59Z');
    expect(isLibraryPickupExpired('aprovado', deadline, new Date('2026-09-11T00:00:00Z'))).toBe(
      true,
    );
    expect(isLibraryPickupExpired('retirado', deadline, new Date('2026-09-11T00:00:00Z'))).toBe(
      false,
    );
  });
});
