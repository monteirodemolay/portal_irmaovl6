import 'server-only';
import { criptaCryptoRef } from './cripta-crypto-state';
import { openingRef } from './online-opening';
import { sealRef } from './seal-state';

export const CEREMONIES = ['inauguracao', 'abertura', 'fechamento', 'reabertura'] as const;
export type Ceremony = (typeof CEREMONIES)[number];
export type CeremonyEvent = Record<string, unknown> & { id: string; type?: string; at?: string };

/** Shared by the log aggregator (Projetor) and the relatório para o registro histórico — every event already
 * lives under its own ceremony's document (criptaCryptoV1 for inauguração/sorteio,
 * criptaOnlineOpeningV1 for abertura/fechamento, criptaSealsV1 for lacração); this just joins
 * them in chronological order. Abertura e reabertura share the same 'opened' events (reabertura
 * is structurally a later abertura); fechamento folds in the lacração that always follows it. */
export async function eventsForCeremony(tenantId: string, ceremony: Ceremony): Promise<CeremonyEvent[]> {
  const sources =
    ceremony === 'inauguracao'
      ? [criptaCryptoRef(tenantId).collection('events')]
      : ceremony === 'abertura' || ceremony === 'reabertura'
        ? [openingRef(tenantId).collection('events')]
        : [openingRef(tenantId).collection('events'), sealRef(tenantId).collection('events')];
  const snapshots = await Promise.all(sources.map((source) => source.get()));
  return snapshots
    .flatMap((snapshot) => snapshot.docs)
    .map((doc) => ({ id: doc.id, ...doc.data() }) as CeremonyEvent)
    .filter((event) => (ceremony === 'fechamento' ? event.type !== 'opened' : event.type !== 'closed'))
    .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
}
