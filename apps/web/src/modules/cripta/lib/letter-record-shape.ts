/** Pure shape and validation for a letter's ficha, with no Firestore dependency — kept separate
 * from letter-record.ts (which has `server-only`) so tests can exercise the real validation and
 * record-building logic against a fake Firestore, the same split seal-manifest.ts/seal-state.ts
 * already use. */

export const DELIVERY_MODES = ['privada', 'sessao', 'ambas'] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];
export type LetterRecordStatus = 'ativa' | 'retida';
export type LetterHistoryAction = 'criada' | 'retida' | 'reativada' | 'modo_alterado';

export type LetterRecord = {
  ownerUid: string;
  label: string;
  deliveryMode: DeliveryMode;
  status: LetterRecordStatus;
  createdAt: string;
  updatedAt: string;
  supersedes: string | null;
  history: Array<{ at: string; actorUid: string; action: LetterHistoryAction }>;
};

export const MAX_LABEL_LENGTH = 80;

/** The author's own free label — never the recipient's legal name is required, never read by
 * anyone but the author. Kept deliberately permissive (any non-empty text up to the limit) since
 * the whole point is the author recognizing their own letter later, in their own words. */
export function sanitizeLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_LABEL_LENGTH) return null;
  return trimmed;
}

export function isDeliveryMode(value: unknown): value is DeliveryMode {
  return typeof value === 'string' && (DELIVERY_MODES as readonly string[]).includes(value);
}

/** Called from the same transaction that commits the sealed capsule — a letter is never ready
 * without its ficha existing right alongside it, and vice versa. */
export function buildLetterRecord(input: {
  ownerUid: string;
  label: string;
  deliveryMode: DeliveryMode;
  supersedes: string | null;
}): LetterRecord {
  const at = new Date().toISOString();
  return {
    ownerUid: input.ownerUid,
    label: input.label,
    deliveryMode: input.deliveryMode,
    status: 'ativa',
    createdAt: at,
    updatedAt: at,
    supersedes: input.supersedes,
    history: [{ at, actorUid: input.ownerUid, action: 'criada' }],
  };
}
