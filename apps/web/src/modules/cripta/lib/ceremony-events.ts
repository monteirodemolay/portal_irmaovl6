import 'server-only';
import { getAdminFirestore } from '@vl6/infra';
import { criptaCryptoRef } from './cripta-crypto-state';
import { openingRef } from './online-opening';
import { sealRef } from './seal-state';

export const CEREMONIES = ['inauguracao', 'abertura', 'fechamento', 'reabertura'] as const;
export type Ceremony = (typeof CEREMONIES)[number];
export type CeremonyEvent = Record<string, unknown> & { id: string; type?: string; at?: string };

/** Mesma coleção já usada ad hoc por appoint-custodians.ts, wizard-status.ts etc. — ainda sem um
 * ref dedicado; só esta leitura precisava de um helper próprio. */
function governanceRef(tenantId: string) {
  return getAdminFirestore().collection('criptaGovernanceV1').doc(tenantId);
}

/** Shared by the log aggregator (Projetor) and the relatório para o registro histórico — every event already
 * lives under its own ceremony's document (criptaCryptoV1 for inauguração/sorteio,
 * criptaGovernanceV1 for a designação da Comissão de Guarda, criptaOnlineOpeningV1 for
 * abertura/fechamento, criptaSealsV1 for lacração); this just joins them in chronological order.
 * Abertura e reabertura share the same 'opened' events (reabertura is structurally a later
 * abertura) e também a designação da Comissão, que sempre antecede a abertura do recebimento —
 * sem isso, nomear a Comissão não aparecia no Projetor, só na Administração. fechamento folds in
 * the lacração that always follows it. */
export async function eventsForCeremony(tenantId: string, ceremony: Ceremony): Promise<CeremonyEvent[]> {
  const sources =
    ceremony === 'inauguracao'
      ? [criptaCryptoRef(tenantId).collection('events')]
      : ceremony === 'abertura' || ceremony === 'reabertura'
        ? [openingRef(tenantId).collection('events'), governanceRef(tenantId).collection('events')]
        : [openingRef(tenantId).collection('events'), sealRef(tenantId).collection('events')];
  const snapshots = await Promise.all(sources.map((source) => source.get()));
  return snapshots
    .flatMap((snapshot) => snapshot.docs)
    .map((doc) => ({ id: doc.id, ...doc.data() }) as CeremonyEvent)
    .filter((event) => (ceremony === 'fechamento' ? event.type !== 'opened' : event.type !== 'closed'))
    .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
}
