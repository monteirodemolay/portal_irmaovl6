/** Pure tracking/alert logic for the status of each Guardian's Shamir share — kept separate from
 * guardian-shares.ts (which has `server-only`) so this is directly testable, same split used by
 * letter-record-shape.ts/letter-record.ts.
 *
 * Shamir shares can't be cryptographically revoked on their own — once issued, a share keeps the
 * mathematical power to help reconstruct the key forever. Marking one "comprometida" here is an
 * institutional record, not a technical lock: it exists so the Loja knows how many of the 5
 * shares it can still actually trust, and is forced to act — via a Renovação ceremony that
 * generates a new key and reseals pending letters — before that count drops low enough to lose
 * access forever. See docs/architecture/cripta-reabertura-ficha-e-cerimonia.md §8. */

export type GuardianShareStatus = 'valida' | 'comprometida';
export type GuardianShare = { memberId: string; status: GuardianShareStatus };
export type AlertLevel = 'ok' | 'atencao' | 'urgente' | 'critico';

export function isGuardianShareStatus(value: unknown): value is GuardianShareStatus {
  return value === 'valida' || value === 'comprometida';
}

export function validShareCount(shares: GuardianShare[]): number {
  return shares.filter((share) => share.status === 'valida').length;
}

/** `threshold` is normally 3 (the Shamir limiar) — below it, no amount of remaining Guardiões
 * can ever reconstruct the key again, so `critico` fires strictly before that point is reached,
 * not at it: at the threshold itself, a Renovação is still barely possible (it needs exactly
 * `threshold` valid shares to run), so that count is `urgente`, the last safe moment to act. */
export function guardianAlertLevel(validCount: number, total: number, threshold: number): AlertLevel {
  if (validCount < threshold) return 'critico';
  if (validCount === threshold) return 'urgente';
  if (validCount < total) return 'atencao';
  return 'ok';
}

export const ALERT_MESSAGE: Record<AlertLevel, string> = {
  ok: 'Todas as partes estão válidas.',
  atencao: 'Uma parte não está mais confiável. Renovação recomendada na próxima oportunidade com os Guardiões reunidos.',
  urgente: 'Restam só as partes mínimas para reconstruir a chave. Convoque a Renovação agora — qualquer nova perda torna a Cripta inacessível para sempre.',
  critico: 'Não há mais partes suficientes para reconstruir a chave. A Cripta está inacessível até decisão institucional específica.',
};
