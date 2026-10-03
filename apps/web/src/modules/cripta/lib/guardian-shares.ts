import 'server-only';
import { criptaCryptoRef, type CriptaCryptoState } from './cripta-crypto-state';

export * from './guardian-shares-shape';
import type { GuardianShare } from './guardian-shares-shape';

/** Every Guardian starts `valida` the moment the Cripta is inaugurated — called from the same
 * transaction that writes the inauguration itself, so a Guardian roster never exists without a
 * share-status roster right alongside it. */
export function initialGuardianShares(guardianMemberIds: string[]): GuardianShare[] {
  return guardianMemberIds.map((memberId) => ({ memberId, status: 'valida' }));
}

/** Older/defensive fallback: a crypto state written before this tracking existed has no
 * `guardianShares` at all — treat every one of its guardianMemberIds as still valid rather than
 * crash or silently show zero, since nothing has actually been reported comprometida. */
export function currentGuardianShares(state: CriptaCryptoState): GuardianShare[] {
  if (Array.isArray(state.guardianShares) && state.guardianShares.length === state.guardianMemberIds.length) {
    return state.guardianShares;
  }
  return initialGuardianShares(state.guardianMemberIds);
}

export { criptaCryptoRef };
